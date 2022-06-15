# Bitcentral Test by Thomas

## Installation

```bash
$ yarn install
```

## Running the app

```bash
$ yarn start
```

## Environment variables

```
DEMO_PRODUCT=
PRICE_1=
PRICE_2=
PRICE_3=
PRICE_4=
FLORIDA_TAX=
US_TAX=
STATIC_DIR=
STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

## Issues

- NO tests written. :(

- React part is focused on the functionality, so the architecture and design is not that great.

- Subscription with one time off is not possible, so it's done via one time payment with invoice. We need to save user has subscription on our db side for this.
