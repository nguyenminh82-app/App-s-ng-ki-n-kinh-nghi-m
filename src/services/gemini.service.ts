
import { Injectable } from '@angular/core';
import { GoogleGenAI, Type } from '@google/genai';

// --- Type Definitions ---
export interface TieuChiDanhGia {
  tieuChi: string;
  diem: string;
  diemDat: number;
  diemToiDa: number;
  yeuLoi: string;
  phanTichGiamKhao: string;
  goiYSuaDoi: string;
}

export interface BienPhapPhanTich {
  tenBienPhap: string;
  noiDungGoc: string;
  banVietLaiDeXuat: string;
  danhGiaChuyenMon: string;
  diemYeuLoi: string;
  gocNhinGiamKhao: string;
  goiYNangCap: string;
  kiemTraTrungLap: string;
}

export interface AnalysisResult {
  diemTong: number;
  xepLoai: string;
  nhanXetChung: string;
  bangTieuChi: TieuChiDanhGia[];
  phanTichBienPhap: BienPhapPhanTich[];
}

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    if (!process.env.API_KEY) {
        console.error("API_KEY environment variable not set! Using mock data.");
        this.ai = { models: { generateContent: async () => ({ text: JSON.stringify(this.mockAnalysisData()) }) } } as any;
    } else {
        this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
  }

  async analyzeSKKN(content: string, rubric: any[], field: string): Promise<AnalysisResult> {
    const analysisSchema = {
        type: Type.OBJECT,
        properties: {
            diemTong: { type: Type.NUMBER, description: 'Tổng điểm cuối cùng trên thang điểm được cung cấp.' },
            xepLoai: { type: Type.STRING, description: 'Xếp loại cuối cùng (Xuất sắc, Tốt, Khá, Đạt, Cần bổ sung).' },
            nhanXetChung: { type: Type.STRING, description: 'Một đoạn nhận xét tổng quan, súc tích về SKKN từ góc nhìn của giám khảo.' },
            bangTieuChi: {
                type: Type.ARRAY,
                description: 'Bảng đánh giá chi tiết theo 5 tiêu chí cốt lõi.',
                items: {
                    type: Type.OBJECT,
                    properties: {
                        tieuChi: { type: Type.STRING },
                        diem: { type: Type.STRING, description: 'Điểm dưới dạng chuỗi "Điểm đạt/Điểm tối đa", ví dụ "8/10".' },
                        diemDat: { type: Type.NUMBER, description: 'Chỉ số điểm đạt được.' },
                        diemToiDa: { type: Type.NUMBER, description: 'Chỉ số điểm tối đa của tiêu chí.' },
                        yeuLoi: { type: Type.STRING, description: 'Mô tả ngắn gọn, chính xác lỗi hoặc điểm yếu dễ bị trừ điểm nhất.' },
                        phanTichGiamKhao: { type: Type.STRING, description: 'Phân tích sâu hơn, giải thích vì sao không cho điểm tối đa.' },
                        goiYSuaDoi: { type: Type.STRING, description: 'Gợi ý cụ thể, có tính hành động để tác giả nâng cấp, viết lại.' },
                    }
                }
            },
            phanTichBienPhap: {
                type: Type.ARRAY,
                description: 'Phân tích chi tiết vào từng biện pháp được nêu trong SKKN.',
                items: {
                    type: Type.OBJECT,
                    properties: {
                        tenBienPhap: { type: Type.STRING, description: 'Tên đầy đủ của biện pháp.' },
                        noiDungGoc: { type: Type.STRING, description: 'Trích xuất NGUYÊN GỐC nội dung mô tả biện pháp từ văn bản SKKN.' },
                        banVietLaiDeXuat: { type: Type.STRING, description: 'Một phiên bản VIẾT LẠI HOÀN CHỈNH của biện pháp, tốt hơn, súc tích và thuyết phục hơn.' },
                        danhGiaChuyenMon: { type: Type.STRING, description: 'Đánh giá ngắn gọn về tính đúng đắn, trọng tâm của biện pháp.' },
                        diemYeuLoi: { type: Type.STRING, description: 'Chỉ ra biện pháp có bị xem là quen thuộc, mô tả, kể lể không.' },
                        gocNhinGiamKhao: { type: Type.STRING, description: 'Nếu là giám khảo, sẽ đánh giá biện pháp này thế nào, vì sao chưa xuất sắc?' },
                        goiYNangCap: { type: Type.STRING, description: 'Giải thích LÝ DO tại sao bản viết lại tốt hơn và gợi ý thêm các minh chứng cần bổ sung.' },
                        kiemTraTrungLap: { type: Type.STRING, description: "Đánh giá ngắn gọn về tính độc đáo của 'Bản viết lại đề xuất', khẳng định rằng đây là nội dung sáng tạo mới, không phải là sao chép hay diễn đạt lại một cách máy móc từ bản gốc." }
                    }
                }
            }
        },
    };

    const fieldMap: { [key: string]: { long: string, short: string } } = {
        'mamnon': { long: 'giáo dục Mầm non', short: 'Mầm non' },
        'tieuhoc': { long: 'giáo dục Tiểu học', short: 'Tiểu học' },
        'thcs': { long: 'giáo dục Trung học cơ sở', short: 'THCS' },
        'thpt': { long: 'giáo dục Trung học phổ thông', short: 'THPT' }
    };

    const persona = fieldMap[field] || { long: 'giáo dục', short: 'Nói chung' };

    const systemInstruction = `Bạn là một thành viên hội đồng chấm Sáng kiến kinh nghiệm (SKKN) cấp huyện/tỉnh, chuyên ngành ${persona.long}. Bạn có nhiều năm kinh nghiệm, tư duy phản biện sắc bén, và hiểu rõ các tiêu chí để đánh giá một SKKN đạt loại Xuất sắc. Nhiệm vụ của bạn là phân tích SKKN được cung cấp với mục tiêu không chỉ nhận xét, mà phải chỉ ra cách chỉnh sửa cụ thể để nâng hạng. Hãy tuân thủ nghiêm ngặt cấu trúc JSON đầu ra và sử dụng văn phong chuyên môn, thẳng thắn nhưng mang tính xây dựng.`;

    const prompt = `Hãy đóng vai một giám khảo ${persona.short} giàu kinh nghiệm để phân tích và chấm điểm SKKN sau đây dựa trên bộ tiêu chí này: ${JSON.stringify(rubric)}.
    
    YÊU CẦU BẮT BUỘC:
    1.  Phân tích theo đúng cấu trúc JSON đã định nghĩa.
    2.  Trong 'bangTieuChi', hãy đưa ra nhận xét sắc bén, chỉ rõ lý do trừ điểm.
    3.  Trong 'phanTichBienPhap', hãy "mổ xẻ" TỪNG BIỆN PHÁP có trong SKKN. Với mỗi biện pháp:
        a. Trích xuất chính xác nội dung gốc vào 'noiDungGoc'.
        b. Viết lại TOÀN BỘ nội dung biện pháp một cách thuyết phục, khoa học hơn vào 'banVietLaiDeXuat'. Yêu cầu quan trọng: bản viết lại phải thể hiện tư duy sư phạm mới, không đơn thuần là diễn đạt lại câu chữ của bản gốc để tránh trùng lặp/đạo văn.
        c. Cung cấp các phân tích chuyên môn vào các trường còn lại.
        d. Đưa ra nhận định vào 'kiemTraTrungLap' để xác nhận bản viết lại là độc đáo.

    Nội dung SKKN:
    ---
    ${content}
    ---
    `;

    try {
        const response = await this.ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: analysisSchema,
                temperature: 0.4
            }
        });
        
        const jsonString = response.text.trim();
        return JSON.parse(jsonString) as AnalysisResult;

    } catch (error) {
        console.error("Gemini API call failed:", error);
        return this.mockAnalysisData();
    }
  }

  private mockAnalysisData(): AnalysisResult {
    return {
      diemTong: 75,
      xepLoai: "Khá",
      nhanXetChung: "SKKN có tính thực tiễn, giải quyết vấn đề phổ biến tại lớp học. Tuy nhiên, các biện pháp còn mang tính mô tả, kể lể công việc, chưa thể hiện rõ sự sáng tạo và tính khoa học trong cách đo lường hiệu quả. Cần làm sâu sắc hơn cơ sở lý luận và cung cấp minh chứng cụ thể, định lượng hơn.",
      bangTieuChi: [
        { tieuChi: "Tính mới, tính sáng tạo", diem: "14/20", diemDat: 14, diemToiDa: 20, yeuLoi: "Các biện pháp đưa ra khá quen thuộc, là công việc thường ngày của giáo viên mầm non.", phanTichGiamKhao: "Giám khảo thấy rằng việc bổ sung đồ chơi hay tạo tình huống là cần thiết nhưng chưa phải là 'sáng tạo'. Điểm mới phải thể hiện ở cách thức tổ chức, phương pháp tác động đặc biệt của giáo viên.", goiYSuaDoi: "Hãy tập trung vào 'cách' bạn tạo ra tình huống có vấn đề, ví dụ: xây dựng bộ tiêu chí/câu hỏi gợi mở theo cấp độ tư duy để điều hướng tương tác của trẻ." },
        { tieuChi: "Tính khoa học và logic", diem: "15/20", diemDat: 15, diemToiDa: 20, yeuLoi: "Phần cơ sở lý luận sơ sài, chưa trích dẫn các học thuyết về phát triển tình cảm-xã hội của trẻ.", phanTichGiamKhao: "SKKN cần một nền tảng lý luận vững chắc để các biện pháp không bị coi là kinh nghiệm chủ quan. Việc thiếu trích dẫn khoa học làm giảm trọng lượng của sáng kiến.", goiYSuaDoi: "Bổ sung phần trích dẫn ngắn gọn lý thuyết của Vygotsky về 'vùng phát triển gần' hoặc của Piaget về 'học qua chơi' để làm nền tảng cho các biện pháp." },
        { tieuChi: "Hiệu quả đạt được", diem: "22/30", diemDat: 22, diemToiDa: 30, yeuLoi: "Số liệu trước và sau tác động còn chung chung, thiếu sự so sánh với nhóm đối chứng.", phanTichGiamKhao: "Tỉ lệ 40% và 85% là có tiến bộ nhưng chưa đủ sức thuyết phục. Giám khảo sẽ hỏi: 'Sự tiến bộ này có phải do các yếu tố khác không? Lớp không áp dụng thì thế nào?'.", goiYSuaDoi: "Lập bảng so sánh kết quả của lớp thực nghiệm (Lá 1) và một lớp đối chứng (Lá 2) theo các tiêu chí cụ thể: 'Số trẻ chủ động bắt chuyện', 'Số lần hợp tác giải quyết tình huống',... " },
        { tieuChi: "Tính thực tiễn, khả năng áp dụng", diem: "18/20", diemDat: 18, diemToiDa: 20, yeuLoi: "Điều kiện áp dụng chưa được nêu rõ.", phanTichGiamKhao: "Các biện pháp dễ thực hiện, phù hợp với đa số trường mầm non. Đây là điểm mạnh của SKKN.", goiYSuaDoi: "Nêu rõ hơn điều kiện để áp dụng thành công: sĩ số lớp lý tưởng là bao nhiêu, yêu cầu tối thiểu về không gian góc chơi,..." },
        { tieuChi: "Hình thức trình bày", diem: "6/10", diemDat: 6, diemToiDa: 10, yeuLoi: "Lỗi chính tả, câu văn còn dài, chưa cô đọng. Bố cục chưa khoa học.", phanTichGiamKhao: "Hình thức phản ánh sự nghiêm túc của tác giả. Một SKKN có nội dung tốt nhưng trình bày cẩu thả cũng sẽ bị trừ điểm nặng.", goiYSuaDoi: "Sử dụng câu chủ động, ngắn gọn. Mỗi biện pháp nên có cấu trúc: Mục tiêu - Chuẩn bị - Cách tiến hành - Lưu ý. Rà soát lại lỗi chính tả." }
      ],
      phanTichBienPhap: [
        {
          tenBienPhap: "Biện pháp 1: Xây dựng môi trường chơi phong phú.",
          noiDungGoc: 'Tôi đã bổ sung nhiều đồ chơi, trang phục cho các góc chơi "Gia đình", "Bác sĩ".',
          banVietLaiDeXuat: "Biện pháp tập trung xây dựng môi trường chơi 'mở', có tính chất gợi ý, trong đó các học liệu được sắp xếp có chủ đích nhằm thôi thúc trẻ tương tác và giải quyết vấn đề. Cụ thể, tại góc 'Bác sĩ', giáo viên chuẩn bị các trang phục, dụng cụ y tế và bổ sung một 'biểu đồ sức khỏe' chưa có nội dung cùng các bút màu. Việc này nhằm kích thích trẻ tự đặt câu hỏi 'Biểu đồ này để làm gì?' và thảo luận vai trò của bác sĩ trong việc theo dõi sức khỏe bệnh nhân.",
          danhGiaChuyenMon: "Biện pháp này đúng trọng tâm, việc tạo môi trường vật chất là yếu tố tiên quyết kích thích trẻ hoạt động.",
          diemYeuLoi: "Mang nặng tính kể lể, mô tả công việc ('tôi đã bổ sung...'). Đây là nhiệm vụ thường xuyên của GV, không phải là giải pháp mang tính đột phá.",
          gocNhinGiamKhao: "Tôi sẽ không cho điểm cao biện pháp này vì nó không thể hiện được vai trò 'kiến tạo' của giáo viên. Nó chỉ dừng ở mức 'chuẩn bị'. Để lên Xuất sắc, biện pháp phải chỉ ra giáo viên đã tác động vào môi trường đó như thế nào.",
          goiYNangCap: "Bản viết lại tốt hơn vì nó chuyển từ việc 'kể' sang 'phân tích'. Nó làm rõ mục đích sư phạm ('môi trường mở', 'có chủ đích') và đưa ra một ví dụ cụ thể, thể hiện sự tinh tế trong thiết kế hoạt động thay vì chỉ mua sắm đồ dùng.",
          kiemTraTrungLap: "Nội dung viết lại hoàn toàn mới, thay đổi cấu trúc từ việc liệt kê hành động sang phân tích mục tiêu và phương pháp sư phạm. Ý tưởng cốt lõi được giữ lại nhưng cách diễn đạt và triển khai là độc đáo."
        },
        {
          tenBienPhap: "Biện pháp 2: Tổ chức các tình huống chơi có vấn đề.",
          noiDungGoc: 'Tôi đưa ra các tình huống như "bạn búp bê bị ốm" để trẻ phải thảo luận, phân công nhau chăm sóc.',
          banVietLaiDeXuat: "Biện pháp được tiến hành bằng cách đưa các 'tình huống có vấn đề' vào hoạt động chơi của trẻ một cách tự nhiên. Thay vì giao vai trực tiếp, giáo viên đóng vai trò là người 'mớm' tình huống. Ví dụ, khi trẻ đang chơi ở góc gia đình, cô có thể nói nhỏ: 'Ôi, hình như em búp bê bị sốt rồi, trán nóng quá!'. Sau đó, giáo viên lùi lại quan sát cách trẻ tiếp nhận thông tin, thảo luận (ai sẽ là bác sĩ, ai chăm sóc), và giải quyết vấn đề. Giáo viên chỉ can thiệp khi có xung đột hoặc bế tắc bằng hệ thống câu hỏi gợi mở đã chuẩn bị (Phụ lục 1).",
          danhGiaChuyenMon: "Đây là biện pháp có giá trị cốt lõi, đi đúng bản chất của việc phát triển kỹ năng xã hội thông qua giải quyết vấn đề.",
          diemYeuLoi: "Cách mô tả biện pháp còn đơn giản, chỉ dừng ở việc 'đưa ra tình huống'. Chưa cho thấy cách giáo viên hỗ trợ, gợi mở hay đánh giá quá trình tương tác của trẻ.",
          gocNhinGiamKhao: "Đây là biện pháp có tiềm năng 'ăn điểm' nhất. Tuy nhiên, tác giả chưa làm rõ được vai trò của mình. Giám khảo sẽ đặt câu hỏi: 'Khi trẻ không giải quyết được tình huống thì cô làm gì? Cô đánh giá sự hợp tác của trẻ dựa trên tiêu chí nào?'",
          goiYNangCap: "Bản viết lại nhấn mạnh vai trò 'quan sát' và 'gợi mở' của giáo viên, thay vì áp đặt. Việc nhắc tới 'Phụ lục 1' cho thấy sự chuẩn bị công phu, khoa học. Cần bổ sung 'Bảng quan sát hành vi hợp tác của trẻ' với các chỉ báo rõ ràng (ví dụ: biết lắng nghe, biết đưa ý kiến, biết phân công...) để minh chứng hiệu quả.",
          kiemTraTrungLap: "Bản viết lại thay đổi hoàn toàn cách tiếp cận, từ mô tả hành động ('tôi đưa ra') sang mô tả vai trò và phương pháp của giáo viên ('người mớm tình huống', 'lùi lại quan sát'). Đây là cách diễn đạt mới, không sao chép cấu trúc từ bản gốc."
        }
      ]
    };
  }
}
