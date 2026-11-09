export default function IconoHerramienta({icono}) {
  return icono?.src
    ? <img src={icono.src} alt="" style={{width:'1em',height:'1em',objectFit:'contain'}} />
    : <span>{icono?.emoji||''}</span>
}
