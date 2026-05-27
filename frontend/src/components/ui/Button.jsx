function Button({ children, onClick, variant = 'primary', ...props }) {
  return (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  )
}

export default Button
