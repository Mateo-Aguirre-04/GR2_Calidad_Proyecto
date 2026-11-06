import styles from './Button.module.css'

function Button({
  as: Componente = 'button',
  variante = 'normal',
  className = '',
  children,
  ...props
}) {
  const clases = [
    styles.boton,
    variante === 'bloque' && styles.bloque,
    className,
  ].filter(Boolean).join(' ')

  // Solo los <button> reciben type; los enlaces no
  const extra = Componente === 'button' ? { type: props.type ?? 'button' } : {}

  return (
    <Componente {...props} {...extra} className={clases}>
      {children}
    </Componente>
  )
}

export default Button