import { useHistory } from 'react-router-dom';

const Cancel = ({location}) => {
  const history = useHistory();

  const handleClick = async (e) => {
    e.preventDefault();

    await fetch('/cancel-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscriptionId: location.state.subscription
      }),
    })

    history.push('/account');
  };

  return (
    <div>
      <h1>Cancel</h1>
      <button onClick={handleClick}>Cancel</button>
    </div>
  )
}


export default Cancel;
