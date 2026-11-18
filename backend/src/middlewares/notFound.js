/**
 * STUDIA - Middleware 404 (recurso no encontrado)
 */

const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    error: 'RESOURCE_NOT_FOUND',
    message: `La ruta ${req.method} ${req.originalUrl} no existe en esta API.`,
    data: null,
  });
};

export default notFound;
