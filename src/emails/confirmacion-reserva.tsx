import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

export interface ConfirmacionReservaEmailProps {
  reservationId: string;
  familyName: string;
  titularName: string;
  dateFormatted: string;
  spacesList: string[];
  extraGuests: Array<{ fullName: string; usesPool: boolean }>;
  totalAmountFormatted: string;
  qrToken: string;
  qrDataUrl: string;
  validationUrl: string;
}

export function ConfirmacionReservaEmail({
  reservationId,
  familyName,
  titularName,
  dateFormatted,
  spacesList,
  extraGuests,
  totalAmountFormatted,
  qrToken,
  qrDataUrl,
  validationUrl,
}: ConfirmacionReservaEmailProps) {
  return (
    <div
      style={{
        backgroundColor: "#f8fafc",
        padding: "30px 15px",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        color: "#1e293b",
        lineHeight: "1.5",
      }}
    >
      <div
        style={{
          maxWidth: "600px",
          margin: "0 auto",
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
        }}
      >
        {/* Header */}
        <div
          style={{
            backgroundColor: "#1e3a8a",
            padding: "24px 32px",
            textAlign: "center",
          }}
        >
          <span
            style={{
              color: "#93c5fd",
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
            }}
          >
            Parcela SSCC
          </span>
          <h1
            style={{
              color: "#ffffff",
              fontSize: "24px",
              fontWeight: 700,
              margin: "8px 0 0 0",
            }}
          >
            ¡Reserva Confirmada!
          </h1>
        </div>

        {/* Body content */}
        <div style={{ padding: "32px" }}>
          <p style={{ fontSize: "16px", margin: "0 0 16px 0" }}>
            Hola <strong>{titularName}</strong>,
          </p>
          <p style={{ fontSize: "15px", color: "#475569", margin: "0 0 24px 0" }}>
            El pago de tu reserva para la <strong>{familyName}</strong> ha sido
            procesado exitosamente. A continuación encontrarás el resumen de tu
            visita y tu pase de acceso con código QR.
          </p>

          {/* Details table */}
          <div
            style={{
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "20px",
              marginBottom: "28px",
            }}
          >
            <h3
              style={{
                fontSize: "14px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: "#64748b",
                margin: "0 0 16px 0",
              }}
            >
              Detalles de la Reserva
            </h3>

            <div style={{ marginBottom: "12px" }}>
              <span style={{ color: "#64748b", fontSize: "14px" }}>Fecha: </span>
              <strong style={{ color: "#1e293b", fontSize: "15px" }}>
                {dateFormatted}
              </strong>
            </div>

            <div style={{ marginBottom: "12px" }}>
              <span style={{ color: "#64748b", fontSize: "14px" }}>Familia: </span>
              <strong style={{ color: "#1e293b", fontSize: "15px" }}>
                {familyName}
              </strong>
            </div>

            <div style={{ marginBottom: "12px" }}>
              <span style={{ color: "#64748b", fontSize: "14px" }}>
                Espacios reservados:{" "}
              </span>
              <strong style={{ color: "#1e293b", fontSize: "15px" }}>
                {spacesList.length > 0
                  ? spacesList.join(", ")
                  : "Uso general de parcela"}
              </strong>
            </div>

            <div style={{ marginBottom: "12px" }}>
              <span style={{ color: "#64748b", fontSize: "14px" }}>
                Invitados extra:{" "}
              </span>
              <strong style={{ color: "#1e293b", fontSize: "15px" }}>
                {extraGuests.length > 0
                  ? extraGuests
                      .map(
                        (g) =>
                          `${g.fullName}${g.usesPool ? " (con piscina)" : ""}`
                      )
                      .join(", ")
                  : "Sin invitados extra"}
              </strong>
            </div>

            <div
              style={{
                paddingTop: "12px",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ color: "#64748b", fontSize: "14px" }}>
                Monto pagado:
              </span>
              <strong
                style={{
                  color: "#15803d",
                  fontSize: "18px",
                  fontWeight: 700,
                }}
              >
                {totalAmountFormatted}
              </strong>
            </div>
          </div>

          {/* QR Code Section */}
          <div
            style={{
              backgroundColor: "#f1f5f9",
              border: "1px solid #cbd5e1",
              borderRadius: "10px",
              padding: "24px",
              textAlign: "center",
              marginBottom: "28px",
            }}
          >
            <h2
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "#1e293b",
                margin: "0 0 6px 0",
              }}
            >
              Tu Pase de Acceso QR
            </h2>
            <p
              style={{
                fontSize: "13px",
                color: "#64748b",
                margin: "0 0 16px 0",
              }}
            >
              Presenta este código al ingresar en portería. Cada pase es de uso
              único para tu grupo familiar.
            </p>

            <div style={{ margin: "16px auto" }}>
              <img
                src={qrDataUrl}
                alt="Código QR de Acceso"
                width="220"
                height="220"
                style={{
                  display: "block",
                  margin: "0 auto",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#ffffff",
                  padding: "8px",
                }}
              />
            </div>

            <div
              style={{
                fontSize: "12px",
                color: "#64748b",
                fontFamily: "monospace",
                margin: "12px 0",
                wordBreak: "break-all",
              }}
            >
              Token: {qrToken}
            </div>

            <div>
              <a
                href={validationUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  backgroundColor: "#1e3a8a",
                  color: "#ffffff",
                  textDecoration: "none",
                  padding: "10px 20px",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                Ver pase en línea
              </a>
            </div>
          </div>

          {/* Instructions */}
          <div style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.6" }}>
            <p style={{ margin: "0 0 8px 0" }}>
              <strong>Importante para tu visita:</strong>
            </p>
            <ul style={{ paddingLeft: "20px", margin: "0 0 16px 0" }}>
              <li>
                La reserva corresponde a la jornada completa del día seleccionado.
              </li>
              <li>Conserva este correo o guarda el código QR en tu teléfono móvil.</li>
              <li>
                El uso de la piscina aplica únicamente para personas autorizadas.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            backgroundColor: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            padding: "20px 32px",
            textAlign: "center",
            fontSize: "12px",
            color: "#94a3b8",
          }}
        >
          <p style={{ margin: "0 0 4px 0" }}>
            Parcela SSCC • Colegio Sagrados Corazones
          </p>
          <p style={{ margin: 0 }}>
            ID de Reserva:{" "}
            <span style={{ fontFamily: "monospace" }}>{reservationId}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export function renderConfirmacionReservaHtml(
  props: ConfirmacionReservaEmailProps
): string {
  const rendered = renderToStaticMarkup(<ConfirmacionReservaEmail {...props} />);
  return `<!DOCTYPE html>\n<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Confirmación de Reserva</title></head><body style="margin:0;padding:0;background-color:#f8fafc;">${rendered}</body></html>`;
}
