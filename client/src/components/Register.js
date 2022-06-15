import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [customer, setCustomer] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const {customer} = await fetch('/create-customer', {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        name: name,
      }),
    }).then(r => r.json());

    setCustomer(customer);
  };

  return (
    <main>
      <h1>Bitcentral Test by Thomas</h1>

      <p>
        Stripe test
      </p>

      <form onSubmit={handleSubmit}>
        <label>
          Name
          <input
            type="text"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required />
        </label>
        <label>
          Email
          <input
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required />
        </label>

        <button type="submit">
          Register
        </button>

        { customer && (
          <div>
            <pre>{JSON.stringify(customer, null, 2)}</pre>
            <Link to="/prices">
              <button type="button">Next</button>
            </Link>
          </div>
        )}
      </form>
    </main>
  );
}

export default Register;
