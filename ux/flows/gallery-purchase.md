# Gallery Purchase Flow

## Goal

Make gallery viewing, selection, purchase, and download feel straightforward and trustworthy.

## Main path

1. Customer opens own gallery
2. Customer sees available photos and purchase state clearly
3. Customer selects one or more photos
4. Customer pays through the configured payment flow
5. Paid state is reflected accurately
6. Customer receives download access

## UX principles

- Ownership and entitlement should be obvious
- Paid vs unpaid photos should be visually unambiguous
- Download availability should not overpromise beyond retention limits
- Errors should explain whether the issue is payment, access, or expiry

## Current concerns

- URL generation must not leak localhost links in customer-facing flows
- checkout/payment state should stay consistent across redirects and notifications
- retention/deletion messaging should be clear before access expires
