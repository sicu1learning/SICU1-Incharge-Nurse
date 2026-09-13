/**
 * Comprehensive, bulletproof print utility.
 * Works reliably across standard browsers, sandboxed iframes (such as Google AI Studio preview),
 * pop-up blocked environments, mobile, and desktop.
 */

export const printHtmlElement = (elementId: string, documentTitle: string = 'รายงานสรุป SICU 1') => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`[Print] Element with id "${elementId}" not found. Falling back to default window.print()`);
    try {
      window.print();
    } catch (e) {
      console.error('[Print] window.print() failed:', e);
    }
    return;
  }

  // 1. Gather all styles from the current document
  let stylesHtml = `
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Prompt:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap" rel="stylesheet">
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Prompt:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap');
      
      * {
        box-sizing: border-box !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        font-family: 'Prompt', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      }

      @page {
        size: A4 portrait;
        margin: 0.8cm 0.7cm 0.8cm 0.7cm;
      }

      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background-color: #ffffff !important;
        color: #0f172a !important;
        font-size: 9.5pt !important;
        line-height: 1.35 !important;
        width: 100% !important;
      }

      .no-print, .no-print * {
        display: none !important;
      }

      table {
        width: 100% !important;
        border-collapse: collapse !important;
        page-break-inside: auto;
      }

      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }

      thead {
        display: table-header-group;
      }

      tfoot {
        display: table-footer-group;
      }

      th, td {
        border: 1px solid #94a3b8 !important;
      }

      .printable-area {
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 auto !important;
        padding: 0 !important;
        border: none !important;
        box-shadow: none !important;
      }

      .single-page-summary {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      /* Print toolbar at top of fallback preview */
      .print-fallback-toolbar {
        background: #004d40;
        color: white;
        padding: 12px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 20px;
        border-radius: 8px;
      }

      @media print {
        .print-fallback-toolbar {
          display: none !important;
        }
      }
    </style>
  `;

  // Collect all existing stylesheets & style tags from current document
  document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
    stylesHtml += node.outerHTML + '\n';
  });

  // 2. Clone content & sanitize
  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.no-print').forEach((el) => el.remove());
  const contentHtml = clone.innerHTML;

  // Full HTML string for print
  const fullDocumentHtml = `
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${documentTitle}</title>
      ${stylesHtml}
    </head>
    <body>
      <div class="printable-area font-['Prompt',sans-serif]">
        ${contentHtml}
      </div>
    </body>
    </html>
  `;

  // Strategy A: Hidden iframe method (Works best without popup blockers and inside standard frames)
  try {
    let iframe = document.getElementById('hidden-print-iframe') as HTMLIFrameElement;
    if (iframe) {
      iframe.remove();
    }
    
    iframe = document.createElement('iframe');
    iframe.id = 'hidden-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(fullDocumentHtml);
      doc.close();

      setTimeout(() => {
        try {
          if (iframe.contentWindow) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
          }
        } catch (iframeErr) {
          console.warn('[Print] Iframe print was restricted. Falling back to parent window print or new tab.', iframeErr);
          fallbackPrint(fullDocumentHtml, documentTitle);
        }
      }, 350);
      return;
    }
  } catch (err) {
    console.warn('[Print] Iframe creation failed:', err);
  }

  // Strategy B: Fallback print
  fallbackPrint(fullDocumentHtml, documentTitle);
};

function fallbackPrint(fullHtml: string, title: string) {
  // Try window.open
  try {
    const printWin = window.open('', '_blank', 'width=900,height=750,menubar=yes,toolbar=yes');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(fullHtml);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => {
        try {
          printWin.print();
        } catch (e) {
          console.warn('[Print] printWin.print() error:', e);
        }
      }, 500);
      return;
    }
  } catch (winErr) {
    console.warn('[Print] window.open failed:', winErr);
  }

  // Strategy C: Direct window.print with body class isolation
  const originalTitle = document.title;
  document.title = title;
  document.body.classList.add('is-printing-report');
  
  const cleanup = () => {
    document.body.classList.remove('is-printing-report');
    document.title = originalTitle;
  };

  try {
    window.print();
  } catch (directErr) {
    console.error('[Print] Direct window.print failed:', directErr);
    alert('ระบบไม่สามารถเปิดหน้าต่างพิมพ์โดยอัตโนมัติได้ กรุณากดปุ่ม Ctrl+P หรือ Cmd+P เพื่อสั่งพิมพ์หน้านี้');
  } finally {
    if ('onafterprint' in window) {
      window.addEventListener('afterprint', cleanup, { once: true });
      setTimeout(cleanup, 2500);
    } else {
      setTimeout(cleanup, 1500);
    }
  }
}
