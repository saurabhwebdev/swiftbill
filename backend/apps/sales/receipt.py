from decimal import Decimal


def generate_receipt_text(sale, store, width=48):
    """Generate a plain-text thermal receipt."""
    lines = []

    def center(text):
        return text.center(width)

    def line():
        return '-' * width

    def left_right(left, right):
        space = width - len(left) - len(right)
        return left + ' ' * max(1, space) + right

    currency = '₹' if store.currency == 'INR' else '$' if store.currency == 'USD' else '€' if store.currency == 'EUR' else '£' if store.currency == 'GBP' else store.currency

    def fmt(amount):
        return f"{currency}{Decimal(str(amount)):.2f}"

    # Header
    lines.append(center(store.name.upper()))
    if store.address:
        lines.append(center(store.address))
    city_line = ', '.join(filter(None, [store.city, store.state, store.zip_code]))
    if city_line:
        lines.append(center(city_line))
    if store.phone:
        lines.append(center(f"Tel: {store.phone}"))
    if store.gst_enabled and store.gstin:
        lines.append(center(f"GSTIN: {store.gstin}"))

    lines.append(line())

    # Receipt header text
    if store.receipt_header:
        lines.append(center(store.receipt_header))
        lines.append(line())

    # Receipt info
    lines.append(f"Receipt: {sale.receipt_number}")
    lines.append(left_right(
        f"Date: {sale.created_at.strftime('%d/%m/%Y')}",
        sale.created_at.strftime('%H:%M:%S')
    ))
    cashier_name = sale.cashier.get_full_name() or sale.cashier.username
    lines.append(f"Cashier: {cashier_name}")
    lines.append(f"Payment: {sale.payment_method.upper()}")

    lines.append(line())

    # Column headers
    lines.append(left_right("Item", "Amount"))
    lines.append(line())

    # Items
    subtotal = Decimal('0')
    for item in sale.items.select_related('product').all():
        name = item.product.name
        qty = item.quantity
        price = item.unit_price
        item_total = item.subtotal
        subtotal += item_total

        # Item name line
        if len(name) > width - 15:
            name = name[:width - 18] + '...'

        lines.append(left_right(
            f"{name}",
            fmt(item_total)
        ))
        detail_parts = [f"  {qty} x {fmt(price)}"]
        if item.gst_rate and float(item.gst_rate) > 0:
            detail_parts.append(f"GST {item.gst_rate}%")
        if item.discount and float(item.discount) > 0:
            detail_parts.append(f"Disc -{fmt(item.discount)}")
        lines.append('  '.join(detail_parts))

    lines.append(line())

    # Totals
    lines.append(left_right("Subtotal", fmt(subtotal)))

    tax = Decimal(str(sale.tax_amount))
    if store.gst_enabled and tax > 0:
        half = tax / 2
        lines.append(left_right("CGST", fmt(half)))
        lines.append(left_right("SGST", fmt(half)))
    elif tax > 0:
        lines.append(left_right("Tax", fmt(tax)))

    discount = Decimal(str(sale.discount_amount))
    if discount > 0:
        lines.append(left_right("Discount", f"-{fmt(discount)}"))

    lines.append('=' * width)
    total = Decimal(str(sale.total_amount))
    lines.append(left_right("TOTAL", fmt(total)))
    lines.append('=' * width)

    lines.append('')

    # Footer
    if store.receipt_footer:
        lines.append(center(store.receipt_footer))
    lines.append(center("Powered by SwiftBill"))
    lines.append('')

    return '\n'.join(lines)


def generate_refund_receipt_text(refund, store, width=48):
    """Generate a plain-text refund receipt."""
    lines = []

    def center(text):
        return text.center(width)

    def line():
        return '-' * width

    def left_right(left, right):
        space = width - len(left) - len(right)
        return left + ' ' * max(1, space) + right

    currency = '₹' if store.currency == 'INR' else '$' if store.currency == 'USD' else store.currency

    def fmt(amount):
        return f"{currency}{Decimal(str(amount)):.2f}"

    lines.append(center("*** REFUND ***"))
    lines.append(center(store.name.upper()))
    if store.gst_enabled and store.gstin:
        lines.append(center(f"GSTIN: {store.gstin}"))
    lines.append(line())

    lines.append(f"Refund: {refund.refund_number}")
    lines.append(f"Original: {refund.sale.receipt_number}")
    lines.append(left_right(
        f"Date: {refund.created_at.strftime('%d/%m/%Y')}",
        refund.created_at.strftime('%H:%M:%S')
    ))
    if refund.reason:
        lines.append(f"Reason: {refund.reason}")

    lines.append(line())

    for item in refund.items.select_related('product').all():
        lines.append(left_right(
            f"{item.product.name}",
            fmt(item.subtotal)
        ))
        lines.append(f"  {item.quantity} x {fmt(item.unit_price)}")

    lines.append(line())

    tax = Decimal(str(refund.refund_tax))
    if store.gst_enabled and tax > 0:
        lines.append(left_right("CGST Refund", fmt(tax / 2)))
        lines.append(left_right("SGST Refund", fmt(tax / 2)))

    lines.append('=' * width)
    lines.append(left_right("REFUND TOTAL", fmt(refund.refund_amount)))
    lines.append('=' * width)

    lines.append('')
    lines.append(center("Powered by SwiftBill"))
    lines.append('')

    return '\n'.join(lines)
