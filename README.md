# Liquidación de Pagos v3.15

Corrección del flujo de liquidaciones rechazadas:
- La liquidación rechazada permanece cerrada y visible en el historial.
- El trabajador ve el comentario/motivo del administrador.
- Botón “Crear nueva para este período” inicia una liquidación nueva para las mismas fechas.
- La nueva liquidación no copia horas ni ajustes de la rechazada; comienza limpia.
- Las liquidaciones rechazadas y anuladas no bloquean un nuevo período.
- Se conserva el flujo Devolver = corregir la misma / Rechazar = crear una nueva.


V3.16: acceso unificado por trabajador (correo + teléfono en una sola identidad), migración de historial Andrea al trabajador activo.


## v3.20
Corrección definitiva de autorización del endpoint `/api/admin/users`: la sesión del administrador se valida contra `/auth/v1/user` usando la misma publishable key del frontend; las operaciones administrativas siguen usando exclusivamente `SUPABASE_SECRET_KEY` en el servidor.

V3.21: botones de envío WhatsApp/Gmail siempre visibles para accesos vinculados; se deshabilitan solo si falta ese dato.
