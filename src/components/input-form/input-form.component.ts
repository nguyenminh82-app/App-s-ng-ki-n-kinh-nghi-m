
import { Component, ChangeDetectionStrategy, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

declare var mammoth: any;

@Component({
  selector: 'app-input-form',
  templateUrl: './input-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
})
export class InputFormComponent {
  analyze = output<{ content: string, rubric: any, fileName: string | null, field: string }>();

  skknContent = signal(`
SÁNG KIẾN KINH NGHIỆM
ĐỀ TÀI: MỘT SỐ BIỆN PHÁP NÂNG CAO KHẢ NĂNG TƯƠNG TÁC XÃ HỘI CHO TRẺ 5-6 TUỔI QUA TRÒ CHƠI ĐÓNG VAI

1. Lý do chọn đề tài
Trẻ 5-6 tuổi ở lớp tôi còn nhút nhát. Kỹ năng giao tiếp, hợp tác của trẻ còn yếu.

2. Thực trạng
Đầu năm học, qua khảo sát 30 cháu lớp Lá 1, có tới 40% trẻ còn e dè, ít chia sẻ đồ chơi.

3. Biện pháp thực hiện
Biện pháp 1: Xây dựng môi trường chơi phong phú.
Tôi đã bổ sung nhiều đồ chơi, trang phục cho các góc chơi "Gia đình", "Bác sĩ".
Biện pháp 2: Tổ chức các tình huống chơi có vấn đề.
Tôi đưa ra các tình huống như "bạn búp bê bị ốm" để trẻ phải thảo luận, phân công nhau chăm sóc.

4. Hiệu quả
Cuối học kỳ 1, tỉ lệ trẻ mạnh dạn, chủ động tương tác tăng lên 85%. Trẻ biết hợp tác trong khi chơi.
  `);
  reviewLevel = signal('huyen');
  field = signal('mamnon');
  scale = signal(100);
  fileName = signal<string | null>(null);

  async handleFileUpload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    this.fileName.set(file.name);

    if (file.name.endsWith('.docx')) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        try {
          const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
          this.skknContent.set(result.value);
        } catch (error) {
          console.error('Error reading docx file:', error);
          alert('Không thể đọc tệp .docx. Vui lòng thử một tệp khác hoặc dán nội dung thủ công.');
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.skknContent.set(e.target?.result as string);
      };
      reader.readAsText(file);
    } else {
      alert('Định dạng tệp không được hỗ trợ. Vui lòng chọn tệp .txt hoặc .docx.');
      this.fileName.set(null);
    }
  }
  
  startAnalysis(): void {
    if (this.skknContent().trim().length < 100) {
      alert("Nội dung SKKN quá ngắn. Vui lòng cung cấp nội dung chi tiết hơn.");
      return;
    }
    
    const rubric = this.generateRubric(this.scale());
    
    this.analyze.emit({ content: this.skknContent(), rubric, fileName: this.fileName(), field: this.field() });
  }

  generateRubric(totalScore: number): any[] {
    const weights = {
      tinhMoi: 0.20,
      tinhKhoaHoc: 0.20,
      hieuQua: 0.30,
      tinhThucTien: 0.20,
      hinhThuc: 0.10,
    };
    
    return [
      { tieuChi: 'Tính mới, tính sáng tạo của đề tài', diemToiDa: Math.round(totalScore * weights.tinhMoi) },
      { tieuChi: 'Tính khoa học và logic của nội dung', diemToiDa: Math.round(totalScore * weights.tinhKhoaHoc) },
      { tieuChi: 'Hiệu quả đạt được (so sánh trước – sau áp dụng)', diemToiDa: Math.round(totalScore * weights.hieuQua) },
      { tieuChi: 'Tính thực tiễn, khả năng áp dụng và nhân rộng', diemToiDa: Math.round(totalScore * weights.tinhThucTien) },
      { tieuChi: 'Hình thức trình bày, ngôn ngữ, bố cục', diemToiDa: Math.round(totalScore * weights.hinhThuc) },
    ];
  }
}
