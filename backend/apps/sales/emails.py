import logging
import threading
from decimal import Decimal
from django.core.mail import EmailMultiAlternatives
from django.conf import settings

logger = logging.getLogger(__name__)


def send_receipt_email(sale, store):
    """Send HTML receipt email to customer after sale completion."""
    if not sale.customer_email:
        return False

    from_email = settings.DEFAULT_FROM_EMAIL or settings.EMAIL_HOST_USER
    if not from_email:
        logger.warning("No email configured. Skipping receipt email.")
        return False

    customer = sale.customer_name or 'Valued Customer'
    currency = '₹' if store.currency == 'INR' else '$' if store.currency == 'USD' else '€' if store.currency == 'EUR' else '£' if store.currency == 'GBP' else store.currency

    def fmt(amount):
        return f"{currency}{Decimal(str(amount)):.2f}"

    items_html = ""
    for item in sale.items.select_related('product').all():
        items_html += f"""
        <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #333;">{item.product.name}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #666; text-align: center;">{item.quantity}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #666; text-align: right;">{fmt(item.unit_price)}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #333; text-align: right; font-weight: 600;">{fmt(item.subtotal)}</td>
        </tr>"""

    subtotal = sum(i.subtotal for i in sale.items.all())
    tax = sale.tax_amount
    discount = sale.discount_amount
    total = sale.total_amount

    tax_html = ""
    if store.gst_enabled and tax > 0:
        half = tax / 2
        tax_html = f"""
        <tr>
            <td colspan="3" style="padding: 6px 12px; font-size: 13px; color: #666; text-align: right;">CGST</td>
            <td style="padding: 6px 12px; font-size: 13px; color: #666; text-align: right;">{fmt(half)}</td>
        </tr>
        <tr>
            <td colspan="3" style="padding: 6px 12px; font-size: 13px; color: #666; text-align: right;">SGST</td>
            <td style="padding: 6px 12px; font-size: 13px; color: #666; text-align: right;">{fmt(half)}</td>
        </tr>"""
    elif tax > 0:
        tax_html = f"""
        <tr>
            <td colspan="3" style="padding: 6px 12px; font-size: 13px; color: #666; text-align: right;">Tax</td>
            <td style="padding: 6px 12px; font-size: 13px; color: #666; text-align: right;">{fmt(tax)}</td>
        </tr>"""

    discount_html = ""
    if discount > 0:
        disc_label = "Discount"
        if sale.discount_type == 'percent':
            disc_label = "Discount (%)"
        discount_html = f"""
        <tr>
            <td colspan="3" style="padding: 6px 12px; font-size: 13px; color: #e67e22; text-align: right;">{disc_label}</td>
            <td style="padding: 6px 12px; font-size: 13px; color: #e67e22; text-align: right;">-{fmt(discount)}</td>
        </tr>"""
        if sale.discount_reason:
            discount_html += f"""
        <tr>
            <td colspan="4" style="padding: 2px 12px 6px; font-size: 12px; color: #999; text-align: right; font-style: italic;">({sale.discount_reason})</td>
        </tr>"""

    gstin_html = ""
    if store.gst_enabled and store.gstin:
        gstin_html = f'<p style="margin: 0; font-size: 12px; color: #999;">GSTIN: {store.gstin}</p>'

    store_address = store.address or ''
    city_line = ', '.join(filter(None, [store.city, store.state, store.zip_code]))

    subject = f"Your receipt from {store.name} — {sale.receipt_number}"

    html_content = f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0" style="background: #f5f5f5; padding: 32px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">

<!-- Header -->
<tr><td style="background: linear-gradient(135deg, #2c3e50, #3498db); padding: 32px 24px; text-align: center;">
    <h1 style="margin: 0 0 4px; font-size: 22px; font-weight: 700; color: #ffffff;">{store.name}</h1>
    {f'<p style="margin: 0; font-size: 13px; color: rgba(255,255,255,0.8);">{store_address}</p>' if store_address else ''}
    {f'<p style="margin: 0; font-size: 13px; color: rgba(255,255,255,0.8);">{city_line}</p>' if city_line else ''}
    {f'<p style="margin: 4px 0 0; font-size: 12px; color: rgba(255,255,255,0.6);">GSTIN: {store.gstin}</p>' if store.gst_enabled and store.gstin else ''}
</td></tr>

<!-- Greeting -->
<tr><td style="padding: 28px 24px 8px;">
    <h2 style="margin: 0 0 6px; font-size: 18px; font-weight: 600; color: #2c3e50;">Thank you, {customer}!</h2>
    <p style="margin: 0; font-size: 14px; color: #666; line-height: 1.5;">Thank you for shopping at <strong>{store.name}</strong>. Here's your digital receipt for your records.</p>
</td></tr>

<!-- Receipt Info -->
<tr><td style="padding: 16px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background: #f8f9fa; border-radius: 8px; padding: 12px 16px;">
    <tr>
        <td style="font-size: 12px; color: #999; text-transform: uppercase; letter-spacing: 0.5px;">Receipt</td>
        <td style="font-size: 12px; color: #999; text-transform: uppercase; letter-spacing: 0.5px; text-align: right;">Date</td>
    </tr>
    <tr>
        <td style="font-size: 16px; font-weight: 700; color: #2c3e50; font-family: monospace; padding-top: 2px;">{sale.receipt_number}</td>
        <td style="font-size: 14px; color: #333; text-align: right; padding-top: 2px;">{sale.created_at.strftime('%d %b %Y, %I:%M %p')}</td>
    </tr>
    <tr>
        <td style="font-size: 12px; color: #999; padding-top: 8px;">Payment</td>
        <td style="font-size: 12px; color: #999; padding-top: 8px; text-align: right;">Cashier</td>
    </tr>
    <tr>
        <td style="font-size: 14px; color: #333; text-transform: uppercase; padding-top: 2px;">{sale.payment_method}</td>
        <td style="font-size: 14px; color: #333; text-align: right; padding-top: 2px;">{sale.cashier.get_full_name() or sale.cashier.username}</td>
    </tr>
    </table>
</td></tr>

<!-- Items Table -->
<tr><td style="padding: 8px 24px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
    <thead>
        <tr style="border-bottom: 2px solid #eee;">
            <th style="padding: 8px 12px; font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 0.5px; text-align: left;">Item</th>
            <th style="padding: 8px 12px; font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 0.5px; text-align: center;">Qty</th>
            <th style="padding: 8px 12px; font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 0.5px; text-align: right;">Rate</th>
            <th style="padding: 8px 12px; font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 0.5px; text-align: right;">Amount</th>
        </tr>
    </thead>
    <tbody>
        {items_html}
    </tbody>
    <tfoot>
        <tr>
            <td colspan="3" style="padding: 10px 12px; font-size: 13px; color: #666; text-align: right; border-top: 2px solid #eee;">Subtotal</td>
            <td style="padding: 10px 12px; font-size: 13px; color: #333; text-align: right; border-top: 2px solid #eee; font-weight: 500;">{fmt(subtotal)}</td>
        </tr>
        {tax_html}
        {discount_html}
        <tr>
            <td colspan="3" style="padding: 14px 12px; font-size: 18px; font-weight: 700; color: #2c3e50; text-align: right; border-top: 2px solid #2c3e50;">Total</td>
            <td style="padding: 14px 12px; font-size: 18px; font-weight: 700; color: #2c3e50; text-align: right; border-top: 2px solid #2c3e50;">{fmt(total)}</td>
        </tr>
    </tfoot>
    </table>
</td></tr>

<!-- Footer -->
<tr><td style="padding: 20px 24px 28px; text-align: center; border-top: 1px solid #f0f0f0;">
    {f'<p style="margin: 0 0 8px; font-size: 13px; color: #666;">{store.receipt_footer}</p>' if store.receipt_footer else ''}
    <p style="margin: 0; font-size: 11px; color: #bbb;">Powered by SwiftBill</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>"""

    plain_text = f"""Thank you, {customer}!

Thank you for shopping at {store.name}.

Receipt: {sale.receipt_number}
Date: {sale.created_at.strftime('%d %b %Y, %I:%M %p')}
Total: {fmt(total)}
Payment: {sale.payment_method.upper()}

Powered by SwiftBill
"""

    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=plain_text,
            from_email=from_email,
            to=[sale.customer_email],
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=False)
        logger.info(f"Receipt email sent to {sale.customer_email} for {sale.receipt_number}")
        return True
    except Exception as e:
        logger.error(f"Failed to send receipt email: {e}")
        return False


def send_receipt_email_async(sale, store):
    """Send receipt email in a background thread so checkout stays fast."""
    thread = threading.Thread(target=send_receipt_email, args=(sale, store))
    thread.daemon = True
    thread.start()
