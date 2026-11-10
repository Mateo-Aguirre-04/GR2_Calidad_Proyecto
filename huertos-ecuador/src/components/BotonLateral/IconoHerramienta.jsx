export default function IconoHerramienta({icono, className}) {
  return icono?.src
    ? <img className={className} src={icono.src} alt="" style={{display:'block',width:'var(--tamano-icono, 1em)',height:'var(--tamano-icono, 1em)',objectFit:'contain',imageRendering:'pixelated'}} />
    : <span>{icono?.emoji||''}</span>
}
