import { NextResponse } from 'next/server'
import { MercadoPagoConfig, Payment } from 'mercadopago'
import { createAdminClient } from '@/lib/supabase/admin'

// 1. Configurar Mercado Pago (Tu Access Token de Producción o Test)
const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });

// 2. Configurar Supabase (Usamos la SERVICE_ROLE_KEY para poder escribir sin restricciones)
// IMPORTANTE: Nunca uses la Service Role Key en el frontend, solo aquí en el backend.
const supabase = createAdminClient()

export async function POST(request: Request) {
  try {
    // 3. Obtener la notificación de Mercado Pago
    // MP te manda un objeto con el ID del pago en el body o query param
    const body = await request.json().catch(() => null);
    const url = new URL(request.url);
    const id = body?.data?.id || url.searchParams.get('data.id');

    if (!id) {
      return NextResponse.json({ message: 'Missing ID' }, { status: 400 });
    }

    // 4. Verificar el estado real del pago consultando a MP
    // No confiamos ciegamente en el webhook, preguntamos a MP para estar seguros.
    const payment = new Payment(client);
    const paymentData = await payment.get({ id });

    // 5. Si el pago está aprobado, guardamos en Supabase
    if (paymentData.status === 'approved') {

      // A. Guardar la orden
      const { error: orderError } = await supabase
        .from('orders')
        .insert({
          payment_id: String(paymentData.id),
          total_amount: paymentData.transaction_amount,
          status: 'paid', // O 'approved'
          customer_email: paymentData.payer?.email,
          // Guardamos info extra útil en el JSONB
          customer_details: {
            first_name: paymentData.payer?.first_name,
            phone: paymentData.payer?.phone,
            payment_method: paymentData.payment_method_id
          }
        });

      if (orderError) {
        console.error('Error guardando orden:', orderError);
        return NextResponse.json({ message: 'DB Error' }, { status: 500 });
      }

      // B. (Opcional) Descontar Stock aquí
      // Podrías hacer un loop por los items y restar stock en la tabla 'products'
    }

    // 6. Responder SIEMPRE con 200 OK a Mercado Pago
    // Si no respondes 200, MP te seguirá mandando la notificación por días.
    return NextResponse.json({ message: 'Received' }, { status: 200 });

  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}