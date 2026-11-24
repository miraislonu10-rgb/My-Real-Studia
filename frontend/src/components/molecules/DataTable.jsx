/**
 * STUDIA - Molecula: Tabla de datos
 * ------------------------------------------------------------------
 * Lista tabular generica. Si no hay filas muestra el estado vacio recibido,
 * de modo que ninguna pantalla presente contenido de relleno.
 *
 * ACCESIBILIDAD (PROMPT 16): cada encabezado declara scope="col" para que los
 * lectores de pantalla asocien las celdas con su columna. La tabla acepta un
 * caption opcional que la describe.
 *
 * @param {{
 *   columns: Array<{key:string, header:string, align?:'left'|'right'|'center', render?:Function, className?:string}>,
 *   rows: Array<Record<string, unknown>>,
 *   rowKey: (row:any)=>string|number,
 *   loading?:boolean,
 *   empty?:React.ReactNode,
 *   loadingLabel?:string,
 *   caption?:string,
 * }} props
 */

import Spinner from '../atoms/Spinner.jsx';

export default function DataTable({
  columns,
  rows,
  rowKey,
  loading = false,
  empty,
  loadingLabel = 'Cargando registros...',
  caption,
}) {
  if (loading) return <Spinner label={loadingLabel} />;
  if (!rows.length) return empty ?? null;

  return (
    <div className="table-wrap">
      <table className="table">
        {caption && <caption className="table__caption">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" style={column.align ? { textAlign: column.align } : undefined}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={column.className}
                  style={column.align ? { textAlign: column.align } : undefined}
                >
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
