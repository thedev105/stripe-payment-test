const express = require('express');
const app = express();
const { resolve } = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
// Replace if using a different env file or config
require('dotenv').config({ path: './.env' });

const requiredEnvs = [
  'STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY', 'STATIC_DIR',
  'DEMO_PRODUCT', 'PRICE_1', 'PRICE_2', 'PRICE_3', 'PRICE_4',
  'US_TAX', 'FLORIDA_TAX'
]

const missingEnvs = requiredEnvs.filter(env => !process.env[env]);

if (missingEnvs.length > 0) {
  console.log('Add the following environment variables to your .env file:');
  console.log(missingEnvs.join(', '));

  process.exit();
}

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2020-08-27',
});

const ProductPrices = [
  process.env.PRICE_1,
  process.env.PRICE_2,
  process.env.PRICE_3,
  process.env.PRICE_4,
]

// Use static to serve static assets.
app.use(express.static(process.env.STATIC_DIR));

// Use cookies to simulate logged in user.
app.use(cookieParser());

// Use JSON parser for parsing payloads as JSON on all non-webhook routes.
app.use((req, res, next) => {
  if (req.originalUrl === '/webhook') {
    next();
  } else {
    bodyParser.json()(req, res, next);
  }
});

app.get('/', (req, res) => {
  const path = resolve(process.env.STATIC_DIR + '/index.html');
  res.sendFile(path);
});

app.get('/config', async (req, res) => {
  const prices = await stripe.prices.list({
    product: process.env.DEMO_PRODUCT,
    expand: ['data.product']
  });

  res.send({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    prices: prices.data.filter(p => ProductPrices.includes(p.id)),
  });
});

app.post('/create-customer', async (req, res) => {
  // Create a new customer object
  const customer = await stripe.customers.create({
    email: req.body.email,
    name: req.body.name,
  });

  // Save the customer.id in your database alongside your user.
  // We're simulating authentication with a cookie.
  res.cookie('customer', customer.id, { maxAge: 900000, httpOnly: true });

  res.send({ customer: customer });
});

app.post('/create-subscription', async (req, res) => {
  // Simulate authenticated user. In practice this will be the
  // Stripe Customer ID related to the authenticated user.
  const customerId = req.cookies['customer'];

  // Create the subscription
  const priceId = req.body.priceId;
  const address = req.body.address;
  const coupon = req.body.coupon;

  const taxRateId = address.state === 'FL' ? process.env.FLORIDA_TAX : process.env.US_TAX

  const price = await stripe.prices.retrieve(priceId);

  try {
    if (price.recurring !== null) {
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{
          price: priceId,
        }],
        coupon,
        payment_behavior: 'default_incomplete',
        default_tax_rates: [taxRateId],
        expand: ['latest_invoice.payment_intent'],
      });

      res.send({
        subscriptionId: subscription.id,
        paymentIntent: subscription.latest_invoice.payment_intent,
      });
    } else {
      const invoiceItem = {
        customer: customerId,
        price: priceId,
        tax_rates: [taxRateId],
      }
      if (coupon) {
        invoiceItem.discounts = [{ coupon }]
      }

      await stripe.invoiceItems.create(invoiceItem)
      const draftInvoice = await stripe.invoices.create({
        customer: customerId
      })
      const invoice = await stripe.invoices.finalizeInvoice(draftInvoice.id)
      const pi = await stripe.paymentIntents.retrieve(invoice.payment_intent);

      res.send({
        paymentIntent: pi
      })
    }
  } catch (error) {
    return res.status(400).send({ error: { message: error.message } });
  }
});

app.get('/coupon', async (req, res) => {
  try {
    const coupon = await stripe.coupons.retrieve(req.query.coupon);
    res.send({ coupon });
  } catch (error) {
    res.status(400).send({ error: { message: error.message } });
  }
})

app.post('/refund', async (req, res) => {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: req.body.paymentIntentId,
    });
    res.send({ refund });
  } catch (error) {
    res.status(400).send({ error: { message: error.message } });
  }
})

app.get('/invoice-preview', async (req, res) => {
  const customerId = req.cookies['customer'];
  const priceId = process.env[req.query.newPriceLookupKey.toUpperCase()];

  const subscription = await stripe.subscriptions.retrieve(
    req.query.subscriptionId
  );

  const invoice = await stripe.invoices.retrieveUpcoming({
    customer: customerId,
    subscription: req.query.subscriptionId,
    subscription_items: [ {
      id: subscription.items.data[0].id,
      price: priceId,
    }],
  });

  res.send({ invoice });
});

app.post('/cancel-subscription', async (req, res) => {
  // Cancel the subscription
  try {
    const deletedSubscription = await stripe.subscriptions.del(
      req.body.subscriptionId
    );

    res.send({ subscription: deletedSubscription });
  } catch (error) {
    return res.status(400).send({ error: { message: error.message } });
  }
});

app.post('/update-subscription', async (req, res) => {
  try {
    const subscription = await stripe.subscriptions.retrieve(
      req.body.subscriptionId
    );
    const updatedSubscription = await stripe.subscriptions.update(
      req.body.subscriptionId, {
        items: [{
          id: subscription.items.data[0].id,
          price: process.env[req.body.newPriceLookupKey.toUpperCase()],
        }],
      }
    );

    res.send({ subscription: updatedSubscription });
  } catch (error) {
    return res.status(400).send({ error: { message: error.message } });
  }
});

app.get('/subscriptions', async (req, res) => {
  // Simulate authenticated user. In practice this will be the
  // Stripe Customer ID related to the authenticated user.
  const customerId = req.cookies['customer'];

  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'active',
    expand: ['data.default_payment_method'],
  });

  res.json({subscriptions});
});

app.post(
  '/webhook',
  bodyParser.raw({ type: 'application/json' }),
  async (req, res) => {
    // Retrieve the event by verifying the signature using the raw body and secret.
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        req.header('Stripe-Signature'),
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.log(err);
      console.log(`⚠️  Webhook signature verification failed.`);
      console.log(
        `⚠️  Check the env file and enter the correct webhook secret.`
      );
      return res.sendStatus(400);
    }

    // Extract the object from the event.
    const dataObject = event.data.object;

    // Handle the event
    // Review important events for Billing webhooks
    // https://stripe.com/docs/billing/webhooks
    // Remove comment to see the various objects sent for this sample
    switch (event.type) {
      case 'invoice.payment_succeeded':
        if(dataObject['billing_reason'] == 'subscription_create') {
          // The subscription automatically activates after successful payment
          // Set the payment method used to pay the first invoice
          // as the default payment method for that subscription
          const subscription_id = dataObject['subscription']
          const payment_intent_id = dataObject['payment_intent']

          // Retrieve the payment intent used to pay the subscription
          const payment_intent = await stripe.paymentIntents.retrieve(payment_intent_id);

          const subscription = await stripe.subscriptions.update(
            subscription_id,
            {
              default_payment_method: payment_intent.payment_method,
            },
          );

          console.log("Default payment method set for subscription:" + payment_intent.payment_method);
        };

        break;
      case 'invoice.payment_failed':
        // If the payment fails or the customer does not have a valid payment method,
        //  an invoice.payment_failed event is sent, the subscription becomes past_due.
        // Use this webhook to notify your user that their payment has
        // failed and to retrieve new card details.
        break;
      case 'invoice.finalized':
        // If you want to manually send out invoices to your customers
        // or store them locally to reference to avoid hitting Stripe rate limits.
        break;
      case 'customer.subscription.deleted':
        if (event.request != null) {
          // handle a subscription cancelled by your request
          // from above.
        } else {
          // handle subscription cancelled automatically based
          // upon your subscription settings.
        }
        break;
      case 'customer.subscription.trial_will_end':
        // Send notification to your user that the trial will end
        break;
      default:
      // Unexpected event type
    }
    res.sendStatus(200);
  }
);

app.listen(4242, () => console.log(`Node server listening on port http://localhost:${4242}!`));
