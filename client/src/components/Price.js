export default function Price({ price, selected, handleSelect }) {
  return (
    <div key={price.id}>
      <h3>{price.product.name}</h3>
      <h6>{price.nickname}</h6>

      <p>${price.unit_amount / 100}</p>

      {selected && (
        <span>Selected</span>
      )}
      {!selected && (
        <button onClick={() => handleSelect(price.id)}>
          Select
        </button>
      )}
    </div>
  )
}
