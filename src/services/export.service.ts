
import { Injectable } from '@angular/core';
import { AnalysisResult, BienPhapPhanTich } from './gemini.service';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } from 'docx';

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  constructor() { }

  public exportToDocx(result: AnalysisResult, originalFileName: string | null): void {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [new TextRun({ text: 'PHIẾU NHẬN XÉT SÁNG KIẾN KINH NGHIỆM', bold: true, size: 32 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({
            text: `Tổng điểm: ${result.diemTong.toFixed(2)}`,
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({
            text: `Xếp loại: ${result.xepLoai}`,
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({
             text: `Nhận xét chung: ${result.nhanXetChung}`,
             spacing: { after: 300 }
          }),
          new Paragraph({
            text: 'BẢNG ĐÁNH GIÁ THEO TIÊU CHÍ CỦA HỘI ĐỒNG',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 200 }
          }),
          this.createCriteriaTable(result),
          new Paragraph({
            text: 'PHÂN TÍCH & VIẾT LẠI TỪNG BIỆN PHÁP',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { before: 600, after: 200 }
          }),
          ...this.createMeasuresAnalysis(result),
        ],
      }],
    });

    Packer.toBlob(doc).then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const baseName = originalFileName ? originalFileName.replace(/\.[^/.]+$/, "") : 'SKKN';
      a.href = url;
      a.download = `Nhan_xet_${baseName}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  private createCriteriaTable(result: AnalysisResult): Table {
    const cellMargin = { top: 100, bottom: 100, left: 100, right: 100 };
    const headerRow = new TableRow({
        children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Tiêu chí', bold: true })] })], margins: cellMargin, width: { size: 20, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Điểm', bold: true })], alignment: AlignmentType.CENTER })], margins: cellMargin, width: { size: 10, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Yếu/Lỗi', bold: true })] })], margins: cellMargin, width: { size: 35, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Phân tích & Gợi ý', bold: true })] })], margins: cellMargin, width: { size: 35, type: WidthType.PERCENTAGE } }),
        ],
        tableHeader: true,
    });
    
    const dataRows = result.bangTieuChi.map(item => {
        return new TableRow({
            children: [
                new TableCell({ children: [new Paragraph(item.tieuChi)], margins: cellMargin, verticalAlign: 'center' }),
                new TableCell({ children: [new Paragraph({ text: item.diem, alignment: AlignmentType.CENTER })], margins: cellMargin, verticalAlign: 'center' }),
                new TableCell({ children: [new Paragraph(item.yeuLoi)], margins: cellMargin, verticalAlign: 'center' }),
                new TableCell({ children: [
                    new Paragraph({ children: [new TextRun({ text: 'Phân tích: ', bold: true }), new TextRun(item.phanTichGiamKhao)] }),
                    new Paragraph({ children: [new TextRun({ text: 'Gợi ý: ', bold: true }), new TextRun(item.goiYSuaDoi)], spacing: {before: 100} }),
                ], margins: cellMargin, verticalAlign: 'center' }),
            ],
        });
    });

    return new Table({
        rows: [headerRow, ...dataRows],
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: { 
          top: { style: BorderStyle.SINGLE, size: 1 }, 
          bottom: { style: BorderStyle.SINGLE, size: 1 }, 
          left: { style: BorderStyle.SINGLE, size: 1 }, 
          right: { style: BorderStyle.SINGLE, size: 1 }
        } as any
    });
  }

  private createMeasuresAnalysis(result: AnalysisResult): (Paragraph | Table)[] {
      let elements: (Paragraph | Table)[] = [];
      const cellMargin = { top: 100, bottom: 100, left: 100, right: 100 };

      result.phanTichBienPhap.forEach((bp) => {
          elements.push(new Paragraph({
              text: bp.tenBienPhap,
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 400, after: 200 }
          }));

          const comparisonTable = new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: { 
                top: { style: BorderStyle.SINGLE, size: 1 }, 
                bottom: { style: BorderStyle.SINGLE, size: 1 }, 
                left: { style: BorderStyle.SINGLE, size: 1 }, 
                right: { style: BorderStyle.SINGLE, size: 1 }
              } as any,
              rows: [
                  new TableRow({
                      tableHeader: true,
                      children: [
                          new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, margins: cellMargin, children: [new Paragraph({ children: [new TextRun({ text: "Bản gốc", bold: true })] })] }),
                          new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, margins: cellMargin, children: [new Paragraph({ children: [new TextRun({ text: "Bản viết lại đề xuất", bold: true })] })] }),
                      ]
                  }),
                  new TableRow({
                      children: [
                          new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, margins: cellMargin, children: [new Paragraph(bp.noiDungGoc)] }),
                          new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, margins: cellMargin, children: [new Paragraph(bp.banVietLaiDeXuat)] }),
                      ]
                  })
              ]
          });
          elements.push(comparisonTable);
          
          elements.push(new Paragraph({
              children: [new TextRun({ text: '🔎 Đánh giá chuyên môn: ', bold: true }), new TextRun(bp.danhGiaChuyenMon)],
              spacing: { before: 200 }
          }));
          elements.push(new Paragraph({
              children: [new TextRun({ text: '⚠️ Điểm yếu / Lỗi: ', bold: true }), new TextRun(bp.diemYeuLoi)]
          }));
           elements.push(new Paragraph({
              children: [new TextRun({ text: '🎯 Góc nhìn giám khảo: ', bold: true }), new TextRun(bp.gocNhinGiamKhao)]
          }));
           elements.push(new Paragraph({
              children: [new TextRun({ text: '✍️ Lý do & Gợi ý nâng cấp: ', bold: true }), new TextRun(bp.goiYNangCap)]
          }));
          elements.push(new Paragraph({
              children: [new TextRun({ text: '🛡️ Kiểm tra tính độc đáo: ', bold: true }), new TextRun(bp.kiemTraTrungLap)]
          }));
      });
      return elements;
  }
}
