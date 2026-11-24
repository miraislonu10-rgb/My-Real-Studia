/**
 * STUDIA - Molecula: Tarjeta de grafica
 * @param {{title:string, subtitle?:string, actions?:React.ReactNode, children:React.ReactNode}} props
 */

export default function ChartCard({ title, subtitle, actions, children }) {
  return (
    <section className="card">
      <div className="card__head">
        <div>
          <h3 className="card__title">{title}</h3>
          {subtitle && <p className="card__subtitle">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
