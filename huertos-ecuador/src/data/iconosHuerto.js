// Vite incluye los PNG en la compilación y cambia su URL cuando cambia la imagen.
const imagenes = import.meta.glob('../assets/iconos/huerto/**/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
})

export function iconoHuerto(grupo, nombre) {
  return imagenes[`../assets/iconos/huerto/${grupo}/${nombre}.png`]
}
