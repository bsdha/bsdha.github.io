(function () {
  "use strict";

  /* =====================================================================
   * BSDHA — Tra cứu tương tác thuốc (bản rút gọn)
   * =====================================================================
   * QUAN TRỌNG:
   * - Đây là công cụ TRA CỨU NHANH, dữ liệu được biên soạn thủ công dựa trên
   *   kiến thức dược lý phổ biến (Dược thư Quốc gia Việt Nam, các tài liệu
   *   dược lâm sàng chuẩn). Danh mục thuốc & tương tác CHỈ bao gồm một số
   *   trường hợp thường gặp, KHÔNG đầy đủ và KHÔNG thay thế Dược thư Quốc
   *   gia Việt Nam, tờ hướng dẫn sử dụng thuốc, hoặc ý kiến dược sĩ lâm sàng.
   * - Liều tối đa nêu ra là liều tối đa THÔNG THƯỜNG cho người lớn, chức
   *   năng gan thận bình thường — LUÔN cần hiệu chỉnh theo từng bệnh nhân
   *   cụ thể (tuổi, cân nặng, chức năng gan/thận, bệnh lý kèm theo...).
   * - Nếu không tìm thấy tương tác trong dữ liệu này, KHÔNG có nghĩa là
   *   2 thuốc chắc chắn an toàn khi phối hợp — chỉ có nghĩa là chưa có
   *   trong danh mục rút gọn này.
   * ===================================================================== */

  // ---------- Cơ sở dữ liệu thuốc ----------
  // key: mã nội bộ (không dấu, viết liền) — name: tên hiển thị
  // aliases: các cách gõ/tên khác (không dấu) để tìm ra thuốc
  // uses: công dụng chính, ngắn gọn — maxDose: liều tối đa người lớn thông thường
  const DRUGS = {
    paracetamol: { name: "Paracetamol", aliases: ["acetaminophen", "efferalgan", "panadol"], uses: "Giảm đau, hạ sốt", maxDose: "4 g/ngày (người lớn, gan bình thường); ≤3 g/ngày nếu có bệnh gan/nghiện rượu" },
    ibuprofen: { name: "Ibuprofen", aliases: ["brufen"], uses: "Giảm đau, kháng viêm, hạ sốt (NSAID)", maxDose: "3200 mg/ngày (thường dùng 1200–2400 mg/ngày)" },
    diclofenac: { name: "Diclofenac", aliases: ["voltaren"], uses: "Giảm đau, kháng viêm (NSAID)", maxDose: "150 mg/ngày" },
    meloxicam: { name: "Meloxicam", aliases: ["mobic"], uses: "Giảm đau, kháng viêm (NSAID, ức chế COX-2 ưu thế)", maxDose: "15 mg/ngày" },
    celecoxib: { name: "Celecoxib", aliases: ["celebrex"], uses: "Giảm đau, kháng viêm (ức chế chọn lọc COX-2)", maxDose: "400 mg/ngày" },
    aspirin: { name: "Aspirin", aliases: ["acid acetylsalicylic", "aspegic"], uses: "Giảm đau/hạ sốt liều cao; chống kết tập tiểu cầu liều thấp (81 mg)", maxDose: "4 g/ngày (giảm đau); 81–100 mg/ngày (dự phòng tim mạch)" },
    warfarin: { name: "Warfarin", aliases: ["coumadin"], uses: "Chống đông đường uống (kháng vitamin K)", maxDose: "Chỉnh theo INR đích (thường 2–3), không có \"liều tối đa\" cố định" },
    clopidogrel: { name: "Clopidogrel", aliases: ["plavix"], uses: "Chống kết tập tiểu cầu", maxDose: "75 mg/ngày (liều nạp 300–600 mg)" },
    enoxaparin: { name: "Enoxaparin", aliases: ["lovenox"], uses: "Chống đông (heparin trọng lượng phân tử thấp)", maxDose: "Theo cân nặng/chỉ định, tối đa thường 1 mg/kg x2/ngày (điều trị)" },
    amlodipine: { name: "Amlodipine", aliases: ["amlor"], uses: "Hạ áp (chẹn kênh calci)", maxDose: "10 mg/ngày" },
    losartan: { name: "Losartan", aliases: ["cozaar"], uses: "Hạ áp (ức chế thụ thể angiotensin II - ARB)", maxDose: "100 mg/ngày" },
    valsartan: { name: "Valsartan", aliases: ["diovan"], uses: "Hạ áp (ARB)", maxDose: "320 mg/ngày" },
    enalapril: { name: "Enalapril", aliases: [], uses: "Hạ áp (ức chế men chuyển - ACEI)", maxDose: "40 mg/ngày" },
    captopril: { name: "Captopril", aliases: [], uses: "Hạ áp (ACEI)", maxDose: "450 mg/ngày (thường dùng 25–150 mg/ngày)" },
    atorvastatin: { name: "Atorvastatin", aliases: ["lipitor"], uses: "Hạ lipid máu (statin)", maxDose: "80 mg/ngày" },
    rosuvastatin: { name: "Rosuvastatin", aliases: ["crestor"], uses: "Hạ lipid máu (statin)", maxDose: "40 mg/ngày (20 mg/ngày ở người châu Á)" },
    simvastatin: { name: "Simvastatin", aliases: ["zocor"], uses: "Hạ lipid máu (statin)", maxDose: "40 mg/ngày (nguy cơ tiêu cơ vân cao hơn khi phối hợp thuốc ức chế CYP3A4)" },
    metformin: { name: "Metformin", aliases: ["glucophage"], uses: "Hạ đường huyết (đái tháo đường típ 2)", maxDose: "2550–3000 mg/ngày (tuỳ chế phẩm)" },
    gliclazide: { name: "Gliclazide", aliases: ["diamicron"], uses: "Hạ đường huyết (sulfonylurea)", maxDose: "320 mg/ngày (thường 30–120 mg/ngày dạng phóng thích chậm)" },
    levothyroxine: { name: "Levothyroxine", aliases: ["levothyrox", "l-thyroxin"], uses: "Hormone tuyến giáp thay thế (suy giáp)", maxDose: "Chỉnh theo TSH đích, thường 1,6 µg/kg/ngày" },
    omeprazole: { name: "Omeprazole", aliases: ["losec"], uses: "Ức chế bơm proton (PPI) — viêm loét dạ dày, GERD", maxDose: "40 mg/ngày (một số chỉ định đến 80 mg/ngày)" },
    esomeprazole: { name: "Esomeprazole", aliases: ["nexium"], uses: "Ức chế bơm proton (PPI)", maxDose: "40 mg/ngày" },
    amoxicillin: { name: "Amoxicillin", aliases: ["amoxil"], uses: "Kháng sinh nhóm beta-lactam (penicillin)", maxDose: "3 g/ngày (nhiễm khuẩn nặng có thể tới 6 g/ngày)" },
    "amoxicillin-clavulanate": { name: "Amoxicillin/Acid clavulanic", aliases: ["augmentin", "amoxiclav"], uses: "Kháng sinh phổ rộng (penicillin + ức chế beta-lactamase)", maxDose: "Theo thành phần amoxicillin, tối đa ~3 g amoxicillin/ngày" },
    azithromycin: { name: "Azithromycin", aliases: ["zithromax"], uses: "Kháng sinh nhóm macrolide", maxDose: "500 mg/ngày (đợt điều trị thường 3–5 ngày)" },
    clarithromycin: { name: "Clarithromycin", aliases: ["klacid"], uses: "Kháng sinh nhóm macrolide", maxDose: "1000 mg/ngày" },
    ciprofloxacin: { name: "Ciprofloxacin", aliases: ["ciprobay"], uses: "Kháng sinh nhóm fluoroquinolone", maxDose: "1500 mg/ngày (uống)" },
    levofloxacin: { name: "Levofloxacin", aliases: ["tavanic"], uses: "Kháng sinh nhóm fluoroquinolone", maxDose: "750 mg/ngày" },
    metronidazole: { name: "Metronidazole", aliases: ["flagyl"], uses: "Kháng sinh/kháng ký sinh trùng (nhóm nitroimidazole)", maxDose: "4 g/ngày (thường dùng 1–1,5 g/ngày)" },
    doxycycline: { name: "Doxycycline", aliases: [], uses: "Kháng sinh nhóm tetracyclin", maxDose: "200 mg/ngày" },
    cephalexin: { name: "Cephalexin", aliases: ["keflex"], uses: "Kháng sinh nhóm cephalosporin (thế hệ 1)", maxDose: "4 g/ngày" },
    ceftriaxone: { name: "Ceftriaxone", aliases: ["rocephin"], uses: "Kháng sinh nhóm cephalosporin (thế hệ 3, tiêm)", maxDose: "4 g/ngày (nhiễm khuẩn nặng)" },
    prednisolone: { name: "Prednisolone", aliases: ["prednison", "prednisone"], uses: "Corticosteroid kháng viêm/ức chế miễn dịch", maxDose: "Theo chỉ định, liều \"sinh lý cao\" thường ≤60 mg/ngày ngắn hạn" },
    methylprednisolone: { name: "Methylprednisolone", aliases: ["medrol", "solumedrol"], uses: "Corticosteroid kháng viêm/ức chế miễn dịch", maxDose: "Theo chỉ định (liều xung có thể tới 1000 mg/ngày, ngắn ngày, theo phác đồ)" },
    furosemide: { name: "Furosemide", aliases: ["lasix"], uses: "Lợi tiểu quai", maxDose: "600 mg/ngày (trường hợp nặng, theo dõi sát điện giải)" },
    spironolactone: { name: "Spironolactone", aliases: ["aldactone"], uses: "Lợi tiểu giữ kali (đối kháng aldosterone)", maxDose: "400 mg/ngày (thường dùng 25–100 mg/ngày)" },
    digoxin: { name: "Digoxin", aliases: ["lanoxin"], uses: "Trợ tim, kiểm soát nhịp thất trong rung nhĩ", maxDose: "0,25–0,375 mg/ngày (cửa sổ điều trị hẹp, cần theo dõi nồng độ)" },
    amiodarone: { name: "Amiodarone", aliases: ["cordarone"], uses: "Chống loạn nhịp tim", maxDose: "Liều duy trì thường 100–400 mg/ngày (liều nạp cao hơn, ngắn ngày)" },
    metoprolol: { name: "Metoprolol", aliases: ["betaloc"], uses: "Chẹn beta giao cảm — hạ áp, chống loạn nhịp, suy tim", maxDose: "400 mg/ngày (dạng phóng thích chậm/tăng huyết áp)" },
    propranolol: { name: "Propranolol", aliases: ["inderal"], uses: "Chẹn beta giao cảm không chọn lọc", maxDose: "640 mg/ngày (tuỳ chỉ định, thường thấp hơn nhiều)" },
    diazepam: { name: "Diazepam", aliases: ["valium", "seduxen"], uses: "An thần, giãn cơ, chống co giật (benzodiazepine)", maxDose: "40 mg/ngày (thường dùng liều thấp hơn nhiều, tránh dùng kéo dài)" },
    alprazolam: { name: "Alprazolam", aliases: ["xanax"], uses: "Giải lo âu (benzodiazepine)", maxDose: "4 mg/ngày (rối loạn hoảng sợ có thể cao hơn theo phác đồ)" },
    sertraline: { name: "Sertraline", aliases: ["zoloft"], uses: "Chống trầm cảm (SSRI)", maxDose: "200 mg/ngày" },
    fluoxetine: { name: "Fluoxetine", aliases: ["prozac"], uses: "Chống trầm cảm (SSRI)", maxDose: "80 mg/ngày" },
    amitriptyline: { name: "Amitriptyline", aliases: [], uses: "Chống trầm cảm 3 vòng; cũng dùng giảm đau thần kinh liều thấp", maxDose: "150–300 mg/ngày (trầm cảm); liều đau thần kinh thấp hơn nhiều (10–75 mg)" },
    tramadol: { name: "Tramadol", aliases: ["ultracet"], uses: "Giảm đau opioid nhẹ-trung bình", maxDose: "400 mg/ngày (≤300 mg/ngày ở người cao tuổi)" },
    morphine: { name: "Morphine", aliases: [], uses: "Giảm đau opioid mạnh", maxDose: "Không trần liều cố định — chỉnh theo đáp ứng & tác dụng phụ" },
    codeine: { name: "Codeine", aliases: [], uses: "Giảm đau opioid nhẹ; giảm ho", maxDose: "360 mg/ngày (giảm đau); liều giảm ho thấp hơn nhiều" },
    phenytoin: { name: "Phenytoin", aliases: ["dilantin"], uses: "Chống co giật/động kinh", maxDose: "Chỉnh theo nồng độ máu (khoảng điều trị 10–20 mg/L)" },
    carbamazepine: { name: "Carbamazepine", aliases: ["tegretol"], uses: "Chống co giật/động kinh, ổn định khí sắc, đau thần kinh", maxDose: "1600–2000 mg/ngày (tuỳ chỉ định)" },
    "valproic-acid": { name: "Acid valproic / Valproate", aliases: ["depakine", "valproat"], uses: "Chống co giật/động kinh, ổn định khí sắc", maxDose: "60 mg/kg/ngày" },
    allopurinol: { name: "Allopurinol", aliases: ["zyloric"], uses: "Hạ acid uric máu (gout)", maxDose: "800 mg/ngày (thường dùng 100–300 mg/ngày)" },
    colchicine: { name: "Colchicine", aliases: [], uses: "Chống viêm trong cơn gout cấp", maxDose: "1,8–2 mg/đợt cấp; liều duy trì 0,5–1,2 mg/ngày" },
    methotrexate: { name: "Methotrexate", aliases: [], uses: "Ức chế miễn dịch liều thấp (viêm khớp dạng thấp, vảy nến); hoá trị liều cao", maxDose: "Liều thấp thường 7,5–25 mg/TUẦN (KHÔNG dùng hằng ngày trong bệnh tự miễn)" },
    theophylline: { name: "Theophylline", aliases: [], uses: "Giãn phế quản (hen, COPD)", maxDose: "Chỉnh theo nồng độ máu (khoảng điều trị 10–20 mg/L)" },
    salbutamol: { name: "Salbutamol", aliases: ["ventolin", "albuterol"], uses: "Giãn phế quản tác dụng nhanh (cường beta-2)", maxDose: "32 mg/ngày (uống); dạng xịt theo nhu cầu, không quá liều khuyến cáo" },
    montelukast: { name: "Montelukast", aliases: ["singulair"], uses: "Kháng leukotriene — dự phòng hen, viêm mũi dị ứng", maxDose: "10 mg/ngày" },
    loratadine: { name: "Loratadine", aliases: ["clarityne"], uses: "Kháng histamine H1 (dị ứng), ít gây buồn ngủ", maxDose: "10 mg/ngày" },
    cetirizine: { name: "Cetirizine", aliases: ["zyrtec"], uses: "Kháng histamine H1 (dị ứng)", maxDose: "10 mg/ngày" },
    domperidone: { name: "Domperidone", aliases: ["motilium"], uses: "Chống nôn, tăng nhu động (đối kháng dopamine ngoại biên)", maxDose: "30 mg/ngày (đợt điều trị ngắn ngày, thận trọng tim mạch)" },
    metoclopramide: { name: "Metoclopramide", aliases: ["primperan"], uses: "Chống nôn, tăng nhu động dạ dày-ruột", maxDose: "30 mg/ngày (≤5 ngày, nguy cơ tác dụng phụ ngoại tháp)" },

  // ============================================================
  // DỮ LIỆU MỞ RỘNG — gộp từ 5 đợt biên soạn (nội cơ bản, ung bướu+
  // nhi, sản/ngoại/ICU/thận/mắt/TMH, nội chuyên sâu, cấp cứu/tiết
  // niệu/CTCH/da liễu/Đông y-TPCN). Dán các dòng dưới đây vào NGAY
  // BÊN TRONG object DRUGS hiện có (thêm dấu phẩy trước nếu cần).
  // ============================================================

  acetylcysteine: { name: "Acetylcysteine (N-acetylcystein)", aliases: ["acc"], uses: "Long đờm; giải độc paracetamol (liều cao, IV)", maxDose: "Long đờm: 600 mg/ngày; giải độc theo phác đồ riêng" },
  activatedCharcoal: { name: "Than hoạt tính", aliases: ["carbogastrin"], uses: "Hấp phụ chất độc trong ngộ độc cấp đường uống (trong giờ đầu sau uống)", maxDose: "1 g/kg (liều đơn), có thể lặp lại nhiều liều trong một số ngộ độc đặc biệt" },
  adrenaline_icu: { name: "Adrenaline (Epinephrine, dùng ICU/cấp cứu)", aliases: ["epinephrin"], uses: "Vận mạch trong sốc nặng, ngừng tim, phản vệ", maxDose: "Theo phác đồ cấp cứu cụ thể (ngừng tim vs sốc vs phản vệ có liều khác nhau hoàn toàn)" },
  alendronate: { name: "Alendronate", aliases: ["fosamax"], uses: "Điều trị loãng xương (bisphosphonate)", maxDose: "70 mg/tuần (uống)" },
  ambroxol: { name: "Ambroxol", aliases: ["mucosolvan"], uses: "Long đờm", maxDose: "120 mg/ngày" },
  amikacin: { name: "Amikacin", aliases: [], uses: "Kháng sinh nhóm aminoglycoside (tiêm)", maxDose: "15 mg/kg/ngày; theo dõi nồng độ máu" },
  amoxicillin_nhi: { name: "Amoxicillin (dạng nhi/siro)", aliases: [], uses: "Kháng sinh cho trẻ em", maxDose: "25–50 mg/kg/ngày chia 2–3 lần (tối đa theo cân nặng, không vượt liều người lớn)" },
  apixaban: { name: "Apixaban", aliases: ["eliquis"], uses: "Chống đông đường uống thế hệ mới (ức chế Xa)", maxDose: "10 mg/ngày (thường 2 x 5 mg/ngày)" },
  articaine: { name: "Articaine (gây tê nha khoa)", aliases: ["ultracain"], uses: "Gây tê tại chỗ trong nha khoa", maxDose: "7 mg/kg (không vượt liều độc toàn thân)" },
  atenolol: { name: "Atenolol", aliases: ["tenormin"], uses: "Chẹn beta chọn lọc — hạ áp", maxDose: "100 mg/ngày" },
  atropine: { name: "Atropine", aliases: [], uses: "Kháng cholinergic — tiền mê, xử trí nhịp chậm, giải độc phospho hữu cơ", maxDose: "Theo chỉ định cụ thể, khác nhau rõ rệt (tiền mê vs cấp cứu ngộ độc)" },
  atropine_eye: { name: "Atropine (nhỏ mắt)", aliases: [], uses: "Giãn đồng tử, liệt điều tiết (soi đáy mắt, viêm màng bồ đào)", maxDose: "Theo chỉ định, tác dụng kéo dài nhiều ngày" },
  atropine_ngodoc: { name: "Atropine (dùng giải độc phospho hữu cơ)", aliases: [], uses: "Giải độc ngộ độc phospho hữu cơ/carbamate (thuốc trừ sâu) — đối kháng tác dụng cholinergic", maxDose: "Chỉnh liều theo đáp ứng lâm sàng (khô tiết, hết co đồng tử), có thể cần liều rất cao và lặp lại nhiều lần" },
  azathioprine: { name: "Azathioprine", aliases: ["imuran"], uses: "Ức chế miễn dịch — lupus, viêm khớp dạng thấp, sau ghép tạng", maxDose: "2,5 mg/kg/ngày" },
  betahistine: { name: "Betahistine", aliases: ["betaserc"], uses: "Điều trị chóng mặt trong hội chứng Meniere, rối loạn tiền đình", maxDose: "48 mg/ngày" },
  betamethasone: { name: "Betamethasone", aliases: ["diprospan"], uses: "Corticosteroid (uống/tiêm/bôi)", maxDose: "Theo chỉ định, đa dạng dạng dùng" },
  bisacodyl: { name: "Bisacodyl", aliases: ["dulcolax"], uses: "Nhuận tràng kích thích", maxDose: "10 mg/ngày" },
  bismuth: { name: "Bismuth subcitrate", aliases: ["trymo"], uses: "Diệt H. pylori (phối hợp), bảo vệ niêm mạc", maxDose: "Theo phác đồ diệt H. pylori" },
  bisoprolol: { name: "Bisoprolol", aliases: ["concor"], uses: "Chẹn beta chọn lọc — hạ áp, suy tim", maxDose: "10 mg/ngày (20 mg/ngày trong một số trường hợp)" },
  budesonide: { name: "Budesonide", aliases: ["pulmicort"], uses: "Corticosteroid dạng hít (hen, COPD)", maxDose: "Theo chỉ định, dạng hít" },
  bupivacaine: { name: "Bupivacaine", aliases: ["marcain"], uses: "Gây tê tại chỗ/vùng, tê tuỷ sống, ngoài màng cứng", maxDose: "2–3 mg/kg (không vượt liều độc toàn thân)" },
  calcitonin: { name: "Calcitonin", aliases: ["miacalcic"], uses: "Giảm đau trong gãy xương do loãng xương, tăng canxi máu", maxDose: "200 IU/ngày (dạng xịt mũi)" },
  calcitriol: { name: "Calcitriol (Vitamin D hoạt hoá)", aliases: ["rocaltrol"], uses: "Điều trị cường cận giáp thứ phát do suy thận mạn", maxDose: "0,25–1 mcg/ngày, theo dõi canxi máu tránh tăng canxi" },
  calcium: { name: "Calcium carbonate/citrate", aliases: ["calci"], uses: "Bổ sung canxi", maxDose: "2500 mg/ngày (canxi nguyên tố)" },
  calciumGluconate_ngodoc: { name: "Calcium gluconate (dùng giải độc)", aliases: [], uses: "Giải độc ngộ độc chẹn kênh calci, tăng kali máu nặng, ngộ độc fluoride/HF", maxDose: "Theo phác đồ cụ thể từng loại ngộ độc" },
  carvedilol: { name: "Carvedilol", aliases: [], uses: "Chẹn alpha-beta — suy tim, hạ áp", maxDose: "50 mg/ngày" },
  cefazolin: { name: "Cefazolin", aliases: [], uses: "Kháng sinh dự phòng phẫu thuật (cephalosporin thế hệ 1, tiêm)", maxDose: "Liều dự phòng thường 1–2 g trước rạch da, có thể lặp lại theo thời gian mổ" },
  cefotaxime: { name: "Cefotaxime", aliases: ["claforan"], uses: "Kháng sinh cephalosporin thế hệ 3 (tiêm)", maxDose: "12 g/ngày (nhiễm khuẩn nặng)" },
  ceftazidime: { name: "Ceftazidime", aliases: ["fortum"], uses: "Kháng sinh cephalosporin thế hệ 3, phổ Pseudomonas (tiêm)", maxDose: "6 g/ngày" },
  cefuroxime: { name: "Cefuroxime", aliases: ["zinnat"], uses: "Kháng sinh cephalosporin thế hệ 2", maxDose: "1500 mg/ngày (uống); 4,5 g/ngày (tiêm)" },
  celecoxib_ck: { name: "Celecoxib (dùng giảm đau sau mổ chỉnh hình)", aliases: [], uses: "Giảm đau đa mô thức sau phẫu thuật chỉnh hình (ức chế COX-2 chọn lọc, ít ảnh hưởng tiểu cầu)", maxDose: "400 mg/ngày (ngắn ngày quanh phẫu thuật)" },
  chlorpheniramine: { name: "Chlorpheniramine", aliases: ["clorpheniramin"], uses: "Kháng histamine H1 thế hệ 1 (gây buồn ngủ)", maxDose: "24 mg/ngày" },
  ciprofloxacin_ear: { name: "Ciprofloxacin (nhỏ tai)", aliases: [], uses: "Kháng sinh nhỏ tai điều trị viêm tai ngoài/giữa có thủng màng nhĩ", maxDose: "Theo chỉ định, thường vài giọt x 2 lần/ngày" },
  cisplatin: { name: "Cisplatin", aliases: [], uses: "Hoá trị (hợp chất platinum)", maxDose: "Theo phác đồ & BSA; độc tính thận/thính giác giới hạn liều mỗi đợt" },
  clindamycin: { name: "Clindamycin", aliases: ["dalacin"], uses: "Kháng sinh nhóm lincosamide", maxDose: "1800 mg/ngày" },
  "clindamycin_bôi": { name: "Clindamycin (dạng bôi ngoài da)", aliases: ["dalacin t"], uses: "Kháng sinh bôi tại chỗ — điều trị mụn trứng cá", maxDose: "Theo chỉ định, bôi 1-2 lần/ngày" },
  clobetasol: { name: "Clobetasol propionate (corticoid bôi mạnh)", aliases: ["dermovate"], uses: "Corticosteroid bôi tại chỗ nhóm hiệu lực rất mạnh", maxDose: "Không quá 50 g/tuần, không dùng kéo dài liên tục >2-4 tuần" },
  clonidine: { name: "Clonidine", aliases: [], uses: "Hạ áp (chủ vận alpha-2 trung ương)", maxDose: "2,4 mg/ngày" },
  cyclophosphamide: { name: "Cyclophosphamide", aliases: ["endoxan"], uses: "Hoá trị (tác nhân alkyl hoá) — nhiều loại ung thư, một số bệnh tự miễn liều thấp", maxDose: "Theo phác đồ & BSA, KHÔNG áp dụng liều tối đa cố định người lớn" },
  cyclosporine: { name: "Cyclosporine", aliases: ["sandimmun", "neoral"], uses: "Ức chế miễn dịch mạnh — sau ghép tạng, bệnh tự miễn nặng", maxDose: "Chỉnh theo nồng độ máu, cửa sổ điều trị hẹp" },
  dabigatran: { name: "Dabigatran", aliases: ["pradaxa"], uses: "Chống đông đường uống thế hệ mới (ức chế trực tiếp thrombin)", maxDose: "300 mg/ngày (2 x 150 mg/ngày)" },
  dapagliflozin: { name: "Dapagliflozin", aliases: ["forxiga"], uses: "Hạ đường huyết (ức chế SGLT2), cũng dùng trong suy tim/bệnh thận mạn", maxDose: "10 mg/ngày" },
  desmopressin: { name: "Desmopressin (DDAVP)", aliases: ["minirin"], uses: "Điều trị đái tháo nhạt; tăng yếu tố VIII trong bệnh Hemophilia A nhẹ/von Willebrand nhẹ", maxDose: "Theo chỉ định cụ thể (đái tháo nhạt vs rối loạn đông máu có liều/đường dùng khác nhau)" },
  dexamethasone_ct: { name: "Dexamethasone (dùng trong hoá trị/chống nôn)", aliases: [], uses: "Chống nôn hỗ trợ hoá trị, giảm phù não/viêm", maxDose: "Theo phác đồ, thường liều thấp hơn corticoid điều trị viêm kéo dài" },
  diltiazem: { name: "Diltiazem", aliases: [], uses: "Hạ áp, chống loạn nhịp (chẹn kênh calci nhóm non-DHP)", maxDose: "360 mg/ngày" },
  dobutamine: { name: "Dobutamine", aliases: [], uses: "Vận mạch — tăng co bóp cơ tim trong sốc tim/suy tim cấp", maxDose: "Truyền liên tục, chỉnh theo đáp ứng huyết động (mcg/kg/phút)" },
  dolutegravir: { name: "Dolutegravir", aliases: ["tivicay"], uses: "Kháng virus HIV (ức chế integrase), thành phần phác đồ hàng đầu hiện nay", maxDose: "50 mg/ngày" },
  domperidone_nhi: { name: "Domperidone (dạng nhi)", aliases: ["motilium nhi"], uses: "Chống nôn cho trẻ em", maxDose: "0,25 mg/kg/lần x 3 lần/ngày, thận trọng tim mạch, tránh dùng kéo dài" },
  doxorubicin: { name: "Doxorubicin", aliases: ["adriamycin"], uses: "Hoá trị (kháng sinh nhóm anthracycline)", maxDose: "Theo phác đồ; có giới hạn liều TÍCH LŨY suốt đời do độc tính tim (thường ~450–550 mg/m²)" },
  efavirenz: { name: "Efavirenz", aliases: ["sustiva"], uses: "Kháng virus HIV (NNRTI)", maxDose: "600 mg/ngày" },
  empagliflozin: { name: "Empagliflozin", aliases: ["jardiance"], uses: "Hạ đường huyết (ức chế SGLT2), suy tim", maxDose: "25 mg/ngày" },
  enoxaparin_ck: { name: "Enoxaparin (dự phòng huyết khối sau phẫu thuật)", aliases: [], uses: "Dự phòng huyết khối tĩnh mạch sâu sau phẫu thuật lớn/chấn thương", maxDose: "40 mg/ngày (liều dự phòng tiêu chuẩn)" },
  entecavir: { name: "Entecavir", aliases: ["baraclude"], uses: "Kháng virus viêm gan B mạn", maxDose: "1 mg/ngày (đã kháng lamivudine) hoặc 0,5 mg/ngày" },
  eperisone: { name: "Eperisone", aliases: ["myonal"], uses: "Giãn cơ vân", maxDose: "150 mg/ngày" },
  epoetin: { name: "Epoetin alfa (Erythropoietin)", aliases: ["eprex"], uses: "Điều trị thiếu máu do suy thận mạn (kích thích sinh hồng cầu)", maxDose: "Theo cân nặng & mức Hb đích, chỉnh liều theo đáp ứng" },
  ethambutol: { name: "Ethambutol", aliases: [], uses: "Kháng lao", maxDose: "1600 mg/ngày (theo cân nặng)" },
  etodolac: { name: "Etodolac", aliases: [], uses: "Giảm đau, kháng viêm (NSAID)", maxDose: "1200 mg/ngày" },
  etoricoxib: { name: "Etoricoxib", aliases: ["arcoxia"], uses: "Giảm đau, kháng viêm (ức chế chọn lọc COX-2)", maxDose: "120 mg/ngày (ngắn ngày)" },
  famotidine: { name: "Famotidine", aliases: ["pepcid"], uses: "Kháng H2 — giảm tiết acid dạ dày", maxDose: "40 mg/ngày" },
  fentanyl: { name: "Fentanyl", aliases: [], uses: "Giảm đau opioid mạnh, dùng trong gây mê/giảm đau sau mổ", maxDose: "Theo cân nặng & bối cảnh lâm sàng, không có trần liều cố định" },
  ferrous_iv: { name: "Sắt tiêm tĩnh mạch (Iron sucrose/Ferric carboxymaltose)", aliases: ["venofer", "ferinject"], uses: "Điều trị thiếu máu thiếu sắt nặng/không dung nạp đường uống", maxDose: "Theo cân nặng & mức thiếu hụt, tính theo công thức Ganzoni hoặc bảng liều cố định" },
  fexofenadine: { name: "Fexofenadine", aliases: ["telfast"], uses: "Kháng histamine H1 thế hệ 2, ít buồn ngủ", maxDose: "180 mg/ngày" },
  fibrinogen: { name: "Fibrinogen cô đặc / Cryoprecipitate", aliases: [], uses: "Bổ sung fibrinogen trong xuất huyết nặng, DIC, sau truyền máu khối lượng lớn", maxDose: "Theo mức fibrinogen máu đo được & mức độ chảy máu" },
  filgrastim: { name: "Filgrastim (G-CSF)", aliases: ["neupogen"], uses: "Kích thích tăng sinh bạch cầu hạt sau hoá trị (giảm bạch cầu do hoá trị)", maxDose: "Theo cân nặng & phác đồ, thường 5 mcg/kg/ngày" },
  finasteride: { name: "Finasteride", aliases: ["proscar"], uses: "Điều trị phì đại tiền liệt tuyến lành tính, rụng tóc (ức chế 5-alpha reductase)", maxDose: "5 mg/ngày (phì đại tiền liệt tuyến); 1 mg/ngày (rụng tóc)" },
  fishOil: { name: "Dầu cá (Omega-3, liều cao)", aliases: ["omega 3"], uses: "Thực phẩm chức năng hỗ trợ tim mạch, hạ triglyceride", maxDose: "Không có liều chuẩn hoá cho TPCN; liều thuốc kê đơn (nếu có) khác biệt" },
  fluconazole: { name: "Fluconazole", aliases: ["diflucan"], uses: "Kháng nấm", maxDose: "800 mg/ngày (nhiễm nấm nặng)" },
  fludrocortisone: { name: "Fludrocortisone", aliases: ["florinef"], uses: "Corticosteroid giữ muối (suy thượng thận, hạ huyết áp tư thế)", maxDose: "0,1–0,2 mg/ngày" },
  flumazenil: { name: "Flumazenil", aliases: ["anexate"], uses: "Giải độc benzodiazepine (quá liều)", maxDose: "Theo đáp ứng, thận trọng ở người nghiện benzodiazepine mạn (nguy cơ co giật khi giải độc đột ngột)" },
  fluorouracil: { name: "Fluorouracil (5-FU)", aliases: ["5fu"], uses: "Hoá trị (kháng chuyển hoá)", maxDose: "Theo phác đồ & BSA" },
  fluticasone: { name: "Fluticasone", aliases: ["flixotide"], uses: "Corticosteroid dạng hít (hen)", maxDose: "Theo chỉ định, dạng hít" },
  fluticasone_nasal: { name: "Fluticasone (xịt mũi)", aliases: ["flixonase", "avamys"], uses: "Corticosteroid xịt mũi — viêm mũi dị ứng", maxDose: "Theo chỉ định, thường 1-2 xịt/mũi/ngày" },
  folicAcid: { name: "Acid folic", aliases: ["folate"], uses: "Dự phòng dị tật ống thần kinh, bổ sung thai kỳ", maxDose: "0,4–5 mg/ngày tuỳ nguy cơ" },
  formoterol: { name: "Formoterol (phối hợp ICS/LABA)", aliases: ["symbicort thanh phan"], uses: "Giãn phế quản cường beta-2 tác dụng kéo dài, thường phối hợp corticoid hít", maxDose: "24 mcg/ngày (dạng hít)" },
  gabapentin: { name: "Gabapentin", aliases: ["neurontin"], uses: "Chống co giật, giảm đau thần kinh", maxDose: "3600 mg/ngày" },
  garlic_supplement: { name: "Tỏi (dạng viên/chiết xuất liều cao)", aliases: ["toi", "allicin"], uses: "Thực phẩm chức năng hỗ trợ tim mạch, hạ lipid (dùng theo dân gian/TPCN)", maxDose: "Không có liều chuẩn hoá; khác hẳn tỏi dùng trong ăn uống thông thường" },
  gentamicin: { name: "Gentamicin", aliases: [], uses: "Kháng sinh nhóm aminoglycoside (tiêm)", maxDose: "Theo cân nặng, 3–5 mg/kg/ngày; theo dõi nồng độ máu" },
  ginger_supplement: { name: "Gừng (dạng viên/chiết xuất liều cao)", aliases: ["gung"], uses: "Thực phẩm chức năng chống buồn nôn, hỗ trợ tiêu hoá (dùng theo dân gian/TPCN)", maxDose: "Không có liều chuẩn hoá; khác hẳn gừng dùng trong ăn uống thông thường" },
  gingko: { name: "Bạch quả (Ginkgo biloba)", aliases: ["ginkgo"], uses: "Thực phẩm chức năng hỗ trợ tuần hoàn não (dùng theo dân gian/TPCN)", maxDose: "Không có liều chuẩn hoá, phụ thuộc sản phẩm cụ thể" },
  ginseng: { name: "Nhân sâm (Ginseng)", aliases: ["hong sam", "sam"], uses: "Thực phẩm bổ dưỡng, tăng cường thể lực (dùng theo Đông y/dân gian)", maxDose: "Không có liều chuẩn hoá, phụ thuộc sản phẩm cụ thể" },
  glimepiride: { name: "Glimepiride", aliases: ["amaryl"], uses: "Hạ đường huyết (sulfonylurea)", maxDose: "8 mg/ngày" },
  glucagon_ngodoc: { name: "Glucagon (dùng giải độc chẹn beta/chẹn kênh calci)", aliases: [], uses: "Giải độc ngộ độc chẹn beta hoặc chẹn kênh calci nặng có sốc tim", maxDose: "Theo cân nặng & phác đồ chống độc, liều cao hơn nhiều so với chỉ định hạ đường huyết thông thường" },
  glucosamine: { name: "Glucosamine", aliases: [], uses: "Bổ sung sụn khớp (thoái hoá khớp)", maxDose: "1500 mg/ngày" },
  haloperidol: { name: "Haloperidol", aliases: [], uses: "Chống loạn thần điển hình", maxDose: "100 mg/ngày (thường thấp hơn nhiều)" },
  heparin_ivi: { name: "Heparin không phân đoạn (truyền tĩnh mạch)", aliases: ["heparin tiem"], uses: "Chống đông trong hội chứng vành cấp, thuyên tắc phổi cấp — dùng đường truyền liên tục", maxDose: "Chỉnh theo aPTT đích (thường 1,5–2,5 lần chứng)" },
  hydrocortisone: { name: "Hydrocortisone", aliases: ["cortef"], uses: "Corticosteroid thay thế (suy thượng thận), liều sinh lý", maxDose: "20–30 mg/ngày (liều thay thế); cao hơn nhiều trong cơn suy thượng thận cấp" },
  hydroxychloroquine: { name: "Hydroxychloroquine", aliases: ["plaquenil"], uses: "Điều trị lupus ban đỏ, viêm khớp dạng thấp (DMARD)", maxDose: "5 mg/kg/ngày (giới hạn theo nguy cơ độc võng mạc khi dùng kéo dài)" },
  ibuprofen_nhi: { name: "Ibuprofen (dạng nhi/siro)", aliases: ["nurofen"], uses: "Giảm đau, hạ sốt, kháng viêm cho trẻ em (>6 tháng tuổi)", maxDose: "5–10 mg/kg/lần, tối đa 4 lần/ngày; tránh dùng khi mất nước/sốt xuất huyết nghi ngờ" },
  imipenem: { name: "Imipenem/Cilastatin", aliases: ["tienam"], uses: "Kháng sinh carbapenem phổ rộng (tiêm)", maxDose: "4 g/ngày" },
  insulin: { name: "Insulin (các loại)", aliases: ["lantus", "mixtard", "actrapid", "novorapid"], uses: "Hạ đường huyết (đái tháo đường)", maxDose: "Chỉnh theo đường huyết, không có liều tối đa cố định" },
  intralipid: { name: "Nhũ dịch lipid tĩnh mạch (Intralipid)", aliases: ["lipid rescue"], uses: "Giải độc ngộ độc thuốc tê tại chỗ nặng (bupivacaine...), một số ngộ độc thuốc tan trong mỡ khác", maxDose: "Theo phác đồ \"lipid rescue\" chuẩn (bolus + truyền liên tục)" },
  ipratropium: { name: "Ipratropium bromide", aliases: ["atrovent"], uses: "Giãn phế quản kháng cholinergic (COPD, hen)", maxDose: "Theo chỉ định, dạng hít/khí dung" },
  irbesartan: { name: "Irbesartan", aliases: ["aprovel"], uses: "Hạ áp (ARB)", maxDose: "300 mg/ngày" },
  ironSupplement: { name: "Sắt (Iron, viên/sirup bổ sung thai kỳ)", aliases: ["ferrous sulfate", "sat"], uses: "Bổ sung sắt, dự phòng/điều trị thiếu máu thai kỳ", maxDose: "Theo mức độ thiếu máu, thường 60–120 mg sắt nguyên tố/ngày" },
  isoniazid: { name: "Isoniazid", aliases: ["inh"], uses: "Kháng lao", maxDose: "300 mg/ngày" },
  isosorbide: { name: "Isosorbide dinitrate/mononitrate", aliases: ["imdur"], uses: "Giãn mạch vành (đau thắt ngực)", maxDose: "Tuỳ chế phẩm, thường 120 mg/ngày (mononitrate phóng thích chậm)" },
  isotretinoin: { name: "Isotretinoin", aliases: ["roaccutane"], uses: "Điều trị mụn trứng cá nặng (retinoid đường uống)", maxDose: "1 mg/kg/ngày; CHỐNG CHỈ ĐỊNH TUYỆT ĐỐI trong thai kỳ (gây quái thai nặng)" },
  itraconazole: { name: "Itraconazole", aliases: ["sporanox"], uses: "Kháng nấm", maxDose: "400 mg/ngày" },
  kayexalate: { name: "Natri/Calci polystyrene sulfonate (Kayexalate/Resonium)", aliases: ["resonium"], uses: "Điều trị tăng kali máu (gắn kali trong ruột)", maxDose: "Theo mức kali máu và đáp ứng, thường 15–30 g/lần" },
  ketamine: { name: "Ketamine", aliases: [], uses: "Thuốc mê phân ly, giảm đau liều thấp", maxDose: "Theo cân nặng & mục đích sử dụng" },
  ketoconazole: { name: "Ketoconazole", aliases: ["nizoral"], uses: "Kháng nấm (uống/bôi)", maxDose: "400 mg/ngày (uống, hạn chế dùng kéo dài do độc gan)" },
  ketoconazole_boi: { name: "Ketoconazole (dạng bôi/dầu gội)", aliases: ["nizoral kem"], uses: "Kháng nấm tại chỗ — lang ben, viêm da tiết bã, nấm da đầu", maxDose: "Theo chỉ định, bôi/gội 2-3 lần/tuần" },
  labetalol: { name: "Labetalol", aliases: ["trandate"], uses: "Hạ áp trong thai kỳ (chẹn alpha-beta)", maxDose: "2400 mg/ngày (uống); liều tiêm theo phác đồ cấp cứu tăng huyết áp thai kỳ" },
  lactulose: { name: "Lactulose", aliases: ["duphalac"], uses: "Nhuận tràng thẩm thấu", maxDose: "Theo đáp ứng, thường 15–45 ml/ngày" },
  lactulose_gan: { name: "Lactulose (dùng điều trị bệnh não gan)", aliases: [], uses: "Nhuận tràng thẩm thấu — điều trị/dự phòng bệnh não gan do xơ gan", maxDose: "Chỉnh liều đến khi đi tiêu 2-3 lần mềm/ngày, có thể cao hơn liều nhuận tràng thông thường" },
  lamivudine: { name: "Lamivudine (3TC)", aliases: ["epivir"], uses: "Kháng virus — điều trị HIV và viêm gan B mạn", maxDose: "300 mg/ngày (HIV); 100 mg/ngày (viêm gan B)" },
  latanoprost: { name: "Latanoprost (nhỏ mắt)", aliases: ["xalatan"], uses: "Hạ nhãn áp (đồng đẳng prostaglandin)", maxDose: "1 giọt/ngày mỗi mắt (buổi tối)" },
  leflunomide: { name: "Leflunomide", aliases: ["arava"], uses: "Điều trị viêm khớp dạng thấp (DMARD)", maxDose: "20 mg/ngày" },
  levetiracetam: { name: "Levetiracetam", aliases: ["keppra"], uses: "Chống co giật/động kinh", maxDose: "3000 mg/ngày" },
  lidocaine: { name: "Lidocaine (Xylocaine)", aliases: ["xylocain"], uses: "Gây tê tại chỗ; chống loạn nhịp tim (dùng tiêm tĩnh mạch, chỉ định khác)", maxDose: "4,5 mg/kg (gây tê, không adrenaline); cao hơn nếu phối hợp adrenaline" },
  linezolid: { name: "Linezolid", aliases: ["zyvox"], uses: "Kháng sinh oxazolidinone, vi khuẩn Gram(+) kháng thuốc", maxDose: "1200 mg/ngày" },
  liraglutide: { name: "Liraglutide", aliases: ["victoza", "saxenda"], uses: "Hạ đường huyết (đồng vận GLP-1, tiêm)", maxDose: "1,8 mg/ngày (đái tháo đường); liều cao hơn cho giảm cân theo chỉ định riêng" },
  lisinopril: { name: "Lisinopril", aliases: [], uses: "Hạ áp (ACEI)", maxDose: "80 mg/ngày (thường 10–40 mg/ngày)" },
  lithium: { name: "Lithium", aliases: [], uses: "Ổn định khí sắc (rối loạn lưỡng cực)", maxDose: "Chỉnh theo nồng độ máu (0,6–1,2 mmol/L)" },
  loperamide: { name: "Loperamide", aliases: ["imodium"], uses: "Cầm tiêu chảy", maxDose: "16 mg/ngày" },
  lopinavir_ritonavir: { name: "Lopinavir/Ritonavir", aliases: ["kaletra"], uses: "Kháng virus HIV (ức chế protease)", maxDose: "800/200 mg/ngày (chia 2 lần)" },
  magnesium_sulfate_sp: { name: "Magnesium sulfate (dùng sản khoa)", aliases: ["mgso4"], uses: "Dự phòng/điều trị co giật trong tiền sản giật-sản giật; giảm co tử cung doạ sinh non", maxDose: "Theo phác đồ, cần theo dõi phản xạ gân xương, nhịp thở, lượng nước tiểu sát (cửa sổ điều trị hẹp)" },
  mannitol: { name: "Mannitol", aliases: [], uses: "Lợi tiểu thẩm thấu — giảm áp lực nội sọ, phù não", maxDose: "Theo cân nặng & áp lực thẩm thấu máu, chỉnh liều theo đáp ứng" },
  meropenem: { name: "Meropenem", aliases: ["meronem"], uses: "Kháng sinh carbapenem phổ rộng (tiêm)", maxDose: "6 g/ngày (nhiễm khuẩn nặng)" },
  methimazole: { name: "Methimazole (Thiamazole)", aliases: ["thyrozol"], uses: "Kháng giáp (cường giáp)", maxDose: "60 mg/ngày (liều tấn công), duy trì thấp hơn nhiều" },
  methotrexate_dalieu: { name: "Methotrexate (dùng điều trị vảy nến)", aliases: [], uses: "Điều trị vảy nến nặng, viêm da cơ địa nặng (liều thấp hàng tuần, giống thấp khớp)", maxDose: "7,5–25 mg/TUẦN (KHÔNG dùng hằng ngày)" },
  methotrexate_hd: { name: "Methotrexate liều cao (hoá trị)", aliases: ["mtx lieu cao"], uses: "Hoá trị liều cao — khác hẳn liều thấp điều trị viêm khớp/vảy nến", maxDose: "Theo phác đồ chuyên khoa, cần cứu hộ bằng leucovorin, theo dõi nồng độ máu bắt buộc" },
  methyldopa: { name: "Methyldopa", aliases: ["aldomet"], uses: "Hạ áp an toàn trong thai kỳ (ưu tiên hàng đầu)", maxDose: "3000 mg/ngày" },
  methylergometrine: { name: "Methylergometrine", aliases: ["ergotamin tu cung"], uses: "Co hồi tử cung sau sinh, xử trí băng huyết", maxDose: "Theo phác đồ; CHỐNG CHỈ ĐỊNH ở người tăng huyết áp/tiền sản giật" },
  midazolam_icu: { name: "Midazolam (dùng an thần ICU/thở máy)", aliases: [], uses: "An thần bệnh nhân thở máy, tiền mê", maxDose: "Truyền liên tục, chỉnh theo thang điểm an thần (RASS/Ramsay)" },
  mirtazapine: { name: "Mirtazapine", aliases: ["remeron"], uses: "Chống trầm cảm (NaSSA)", maxDose: "45 mg/ngày" },
  misoprostol: { name: "Misoprostol", aliases: ["cytotec"], uses: "Gây chuyển dạ, xử trí sảy thai/thai lưu, dự phòng băng huyết sau sinh", maxDose: "Theo chỉ định cụ thể (sản khoa vs tiêu hoá), đường dùng và liều khác nhau rõ rệt theo mục đích" },
  nacetylcysteine_giaidoc: { name: "N-acetylcystein (dùng giải độc paracetamol liều cao)", aliases: ["fluimucil giai doc"], uses: "Giải độc ngộ độc paracetamol — bảo vệ gan khỏi tổn thương do chất chuyển hoá độc NAPQI", maxDose: "Theo phác đồ chuẩn (liều nạp + duy trì theo đường uống hoặc tĩnh mạch), phụ thuộc thời gian từ lúc uống paracetamol" },
  naloxone: { name: "Naloxone", aliases: ["narcan"], uses: "Giải độc opioid (quá liều), đảo ngược ức chế hô hấp do opioid", maxDose: "Theo đáp ứng, có thể lặp lại mỗi 2-3 phút; thời gian tác dụng ngắn hơn nhiều opioid tác dụng kéo dài nên cần theo dõi tái ức chế hô hấp" },
  neostigmine: { name: "Neostigmine", aliases: [], uses: "Giải giãn cơ không khử cực sau phẫu thuật (đối kháng cholinergic)", maxDose: "Theo cân nặng, thường phối hợp atropine/glycopyrrolate để tránh nhịp chậm" },
  nifedipine: { name: "Nifedipine", aliases: ["adalat"], uses: "Hạ áp (chẹn kênh calci)", maxDose: "120 mg/ngày (dạng phóng thích chậm)" },
  nifedipine_sp: { name: "Nifedipine (dùng giảm co sản khoa)", aliases: [], uses: "Giảm co tử cung trong doạ sinh non (tocolytic)", maxDose: "Theo phác đồ giảm co, khác liều hạ áp thông thường" },
  nitroglycerin: { name: "Nitroglycerin", aliases: ["nitromint"], uses: "Giãn mạch vành cấp (đau thắt ngực, cơn nhồi máu)", maxDose: "Theo đường dùng, truyền tĩnh mạch chỉnh theo đáp ứng" },
  noradrenaline_icu: { name: "Noradrenaline (Norepinephrine)", aliases: ["levophed"], uses: "Vận mạch đầu tay trong sốc nhiễm khuẩn/sốc giãn mạch", maxDose: "Truyền liên tục, chỉnh theo huyết áp đích (mcg/kg/phút)" },
  olanzapine: { name: "Olanzapine", aliases: ["zyprexa"], uses: "Chống loạn thần không điển hình", maxDose: "20 mg/ngày" },
  omalizumab: { name: "Omalizumab", aliases: ["xolair"], uses: "Kháng thể đơn dòng anti-IgE — hen dị ứng nặng khó kiểm soát", maxDose: "Theo cân nặng & nồng độ IgE, tiêm dưới da mỗi 2-4 tuần" },
  ondansetron: { name: "Ondansetron", aliases: ["zofran"], uses: "Chống nôn (đối kháng 5-HT3) — dùng nhiều trong hoá trị", maxDose: "24 mg/ngày (uống); liều tiêm theo chỉ định" },
  oresol: { name: "Oresol (dung dịch bù nước điện giải)", aliases: ["ors"], uses: "Bù nước/điện giải khi tiêu chảy, sốt, nôn ở trẻ em", maxDose: "Theo mức độ mất nước & cân nặng, pha đúng tỷ lệ theo hướng dẫn" },
  oxybutynin: { name: "Oxybutynin", aliases: ["ditropan"], uses: "Điều trị bàng quang tăng hoạt (kháng cholinergic)", maxDose: "20 mg/ngày" },
  oxymetazoline: { name: "Oxymetazoline (xịt/nhỏ mũi)", aliases: ["otrivin"], uses: "Co mạch tại chỗ, giảm nghẹt mũi", maxDose: "Không dùng quá 3-5 ngày liên tục (nguy cơ viêm mũi do thuốc — rebound)" },
  oxytocin: { name: "Oxytocin", aliases: ["syntocinon"], uses: "Gây chuyển dạ / tăng co bóp tử cung, dự phòng & điều trị băng huyết sau sinh", maxDose: "Theo phác đồ truyền tĩnh mạch, chỉnh theo đáp ứng cơn co, KHÔNG tiêm bolus nhanh liều cao" },
  paclitaxel: { name: "Paclitaxel", aliases: ["taxol"], uses: "Hoá trị (taxane)", maxDose: "Theo phác đồ & BSA" },
  pantoprazole_gan: { name: "Pantoprazole (dùng trong xuất huyết tiêu hoá cấp)", aliases: [], uses: "PPI liều cao, truyền tĩnh mạch trong xuất huyết tiêu hoá do loét", maxDose: "Theo phác đồ xuất huyết tiêu hoá cấp (bolus + truyền liên tục), khác liều uống thông thường" },
  paracetamol_nhi: { name: "Paracetamol (dạng nhi/siro)", aliases: ["hapacol", "efferalgan siro"], uses: "Giảm đau, hạ sốt cho trẻ em", maxDose: "10–15 mg/kg/lần, tối đa 4 lần/ngày (KHÔNG dùng liều người lớn cố định)" },
  perindopril: { name: "Perindopril", aliases: ["coversyl"], uses: "Hạ áp (ACEI)", maxDose: "10 mg/ngày" },
  pioglitazone: { name: "Pioglitazone", aliases: [], uses: "Hạ đường huyết (thiazolidinedione)", maxDose: "45 mg/ngày" },
  piperacillin: { name: "Piperacillin/Tazobactam", aliases: ["tazocin"], uses: "Kháng sinh phổ rộng (tiêm)", maxDose: "18 g/ngày (theo piperacillin)" },
  piroxicam: { name: "Piroxicam", aliases: ["felden"], uses: "Giảm đau, kháng viêm (NSAID)", maxDose: "20 mg/ngày" },
  pralidoxime: { name: "Pralidoxime (PAM)", aliases: [], uses: "Giải độc phospho hữu cơ — tái hoạt hoá cholinesterase (dùng phối hợp atropine)", maxDose: "Theo cân nặng, càng sớm càng hiệu quả sau phơi nhiễm" },
  prednisolone_eye: { name: "Prednisolone acetate (nhỏ mắt)", aliases: ["pred forte"], uses: "Corticosteroid nhỏ mắt — viêm màng bồ đào, sau phẫu thuật mắt", maxDose: "Theo chỉ định bác sĩ nhãn khoa, cần theo dõi nhãn áp khi dùng kéo dài" },
  pregabalin: { name: "Pregabalin", aliases: ["lyrica"], uses: "Chống co giật, giảm đau thần kinh", maxDose: "600 mg/ngày" },
  propofol: { name: "Propofol", aliases: ["diprivan"], uses: "Thuốc mê tĩnh mạch, an thần thủ thuật/thở máy", maxDose: "Theo cân nặng & mục đích (mê vs an thần), chỉnh theo đáp ứng" },
  propranolol_gan: { name: "Propranolol (dùng dự phòng xuất huyết tiêu hoá do giãn tĩnh mạch)", aliases: [], uses: "Giảm áp lực tĩnh mạch cửa — dự phòng xuất huyết do vỡ giãn tĩnh mạch thực quản trong xơ gan", maxDose: "Chỉnh theo nhịp tim đích (giảm ~25% nhịp tim nền), khác mục tiêu điều trị tăng huyết áp thông thường" },
  propylthiouracil: { name: "Propylthiouracil (PTU)", aliases: [], uses: "Kháng giáp, ưu tiên trong 3 tháng đầu thai kỳ", maxDose: "600 mg/ngày (liều tấn công)" },
  protamine: { name: "Protamine sulfate", aliases: [], uses: "Giải độc/đảo ngược tác dụng heparin", maxDose: "Theo liều heparin đã dùng, tỷ lệ trung hoà cụ thể theo thời gian dùng heparin" },
  pyrazinamide: { name: "Pyrazinamide", aliases: [], uses: "Kháng lao", maxDose: "2000 mg/ngày" },
  quetiapine: { name: "Quetiapine", aliases: ["seroquel"], uses: "Chống loạn thần không điển hình, an thần", maxDose: "800 mg/ngày" },
  rabeprazole: { name: "Rabeprazole", aliases: [], uses: "Ức chế bơm proton (PPI)", maxDose: "20 mg/ngày" },
  ranitidine: { name: "Ranitidine", aliases: ["zantac"], uses: "Kháng H2 — giảm tiết acid dạ dày (hạn chế dùng do thu hồi ở nhiều nước)", maxDose: "300 mg/ngày" },
  rifampicin: { name: "Rifampicin", aliases: ["rifampin"], uses: "Kháng lao/kháng sinh phổ rộng", maxDose: "600 mg/ngày" },
  rifaximin: { name: "Rifaximin", aliases: ["xifaxan"], uses: "Kháng sinh ruột không hấp thu — dự phòng bệnh não gan tái phát, hội chứng ruột kích thích", maxDose: "1100 mg/ngày (bệnh não gan)" },
  risperidone: { name: "Risperidone", aliases: ["risperdal"], uses: "Chống loạn thần không điển hình", maxDose: "16 mg/ngày" },
  rivaroxaban: { name: "Rivaroxaban", aliases: ["xarelto"], uses: "Chống đông đường uống thế hệ mới (ức chế Xa)", maxDose: "20 mg/ngày (rung nhĩ); liều khác theo chỉ định" },
  rivaroxaban_ck: { name: "Rivaroxaban (dự phòng huyết khối sau phẫu thuật chỉnh hình)", aliases: [], uses: "Dự phòng huyết khối tĩnh mạch sâu sau thay khớp háng/gối", maxDose: "10 mg/ngày (liều dự phòng, khác liều điều trị rung nhĩ)" },
  rocuronium: { name: "Rocuronium", aliases: [], uses: "Giãn cơ không khử cực (hỗ trợ đặt nội khí quản, phẫu thuật)", maxDose: "Theo cân nặng, 0,6–1,2 mg/kg tuỳ mục đích" },
  roflumilast: { name: "Roflumilast", aliases: ["daxas"], uses: "Ức chế PDE-4, giảm đợt cấp COPD nặng có viêm phế quản mạn", maxDose: "500 mcg/ngày" },
  salbutamol_nhi: { name: "Salbutamol (dạng khí dung/siro nhi)", aliases: ["ventolin nhi"], uses: "Giãn phế quản cho trẻ em (hen, khò khè)", maxDose: "Theo cân nặng & tuổi, dạng khí dung phổ biến hơn đường uống ở trẻ nhỏ" },
  sevelamer: { name: "Sevelamer", aliases: ["renagel"], uses: "Gắn phosphat trong suy thận mạn (kiểm soát phosphat máu)", maxDose: "Theo mức phosphat máu, uống cùng bữa ăn" },
  sildenafil: { name: "Sildenafil", aliases: ["viagra"], uses: "Điều trị rối loạn cương dương (ức chế PDE-5)", maxDose: "100 mg/lần, không quá 1 lần/ngày" },
  sitagliptin: { name: "Sitagliptin", aliases: ["januvia"], uses: "Hạ đường huyết (ức chế DPP-4)", maxDose: "100 mg/ngày" },
  sodium_bicarbonate: { name: "Natri bicarbonate (viên/dung dịch)", aliases: ["nabica"], uses: "Điều trị toan chuyển hoá trong suy thận mạn", maxDose: "Theo mức độ toan & đáp ứng, theo dõi CO2 máu" },
  sofosbuvir: { name: "Sofosbuvir (phối hợp DAA viêm gan C)", aliases: ["sovaldi"], uses: "Kháng virus viêm gan C mạn (thuốc kháng virus tác dụng trực tiếp)", maxDose: "400 mg/ngày, luôn dùng phối hợp (không đơn trị)" },
  spironolactone_gan: { name: "Spironolactone (dùng trong xơ gan cổ trướng)", aliases: [], uses: "Lợi tiểu giữ kali — kiểm soát cổ trướng trong xơ gan (khác chỉ định tim mạch)", maxDose: "400 mg/ngày, thường phối hợp furosemide theo tỷ lệ 100:40" },
  streptokinase: { name: "Streptokinase", aliases: [], uses: "Tiêu sợi huyết trong nhồi máu cơ tim cấp/thuyên tắc phổi", maxDose: "Theo phác đồ tiêu sợi huyết cụ thể, một lần duy nhất theo cân nặng" },
  succinylcholine: { name: "Succinylcholine (Suxamethonium)", aliases: [], uses: "Giãn cơ khử cực, khởi mê nhanh", maxDose: "1–1,5 mg/kg (liều đặt nội khí quản)" },
  sucralfate: { name: "Sucralfate", aliases: ["ulcar"], uses: "Bảo vệ niêm mạc dạ dày", maxDose: "4 g/ngày" },
  sulfamethoxazole: { name: "Sulfamethoxazole/Trimethoprim", aliases: ["bactrim", "biseptol", "cotrimoxazol"], uses: "Kháng sinh nhóm sulfonamide", maxDose: "Theo trimethoprim 320 mg/ngày (thông thường)" },
  sulfasalazine: { name: "Sulfasalazine", aliases: ["salazopyrin"], uses: "Điều trị viêm khớp dạng thấp, viêm loét đại tràng (DMARD)", maxDose: "3000 mg/ngày" },
  tadalafil: { name: "Tadalafil", aliases: ["cialis"], uses: "Điều trị rối loạn cương dương, phì đại tiền liệt tuyến lành tính (ức chế PDE-5)", maxDose: "20 mg/lần (dùng khi cần) hoặc 5 mg/ngày (dùng hàng ngày)" },
  tamoxifen: { name: "Tamoxifen", aliases: ["nolvadex"], uses: "Nội tiết trong ung thư vú (kháng estrogen)", maxDose: "20–40 mg/ngày" },
  tamsulosin: { name: "Tamsulosin", aliases: ["harnal", "flomax"], uses: "Điều trị triệu chứng phì đại tiền liệt tuyến lành tính (chẹn alpha-1 chọn lọc)", maxDose: "0,8 mg/ngày" },
  telmisartan: { name: "Telmisartan", aliases: ["micardis"], uses: "Hạ áp (ARB)", maxDose: "80 mg/ngày" },
  tenofovir: { name: "Tenofovir (TDF/TAF)", aliases: ["viread"], uses: "Kháng virus — điều trị HIV và viêm gan B mạn", maxDose: "300 mg/ngày (TDF); 25 mg/ngày (TAF)" },
  timolol_eye: { name: "Timolol (nhỏ mắt)", aliases: ["timoptic"], uses: "Hạ nhãn áp trong glaucoma (chẹn beta tại chỗ, vẫn hấp thu toàn thân)", maxDose: "Theo chỉ định, thường 1 giọt x 1-2 lần/ngày mỗi mắt" },
  tiotropium: { name: "Tiotropium", aliases: ["spiriva"], uses: "Giãn phế quản kháng cholinergic tác dụng kéo dài (COPD)", maxDose: "18 mcg/ngày (dạng hít bột khô)" },
  tobramycin_eye: { name: "Tobramycin (nhỏ mắt)", aliases: ["tobrex"], uses: "Kháng sinh nhỏ mắt điều trị viêm kết mạc/giác mạc do vi khuẩn", maxDose: "Theo chỉ định, thường 1-2 giọt mỗi 4 giờ" },
  tolperisone: { name: "Tolperisone", aliases: ["mydocalm"], uses: "Giãn cơ vân", maxDose: "450 mg/ngày" },
  tranexamic: { name: "Acid tranexamic", aliases: ["transamin"], uses: "Cầm máu (kháng tiêu sợi huyết) — chảy máu kinh nguyệt nhiều, chấn thương, phẫu thuật", maxDose: "4 g/ngày (uống); liều tiêm theo phác đồ cấp cứu chấn thương" },
  tretinoin: { name: "Tretinoin (bôi ngoài da)", aliases: ["retin-a"], uses: "Retinoid bôi tại chỗ — mụn trứng cá, chống lão hoá da", maxDose: "Theo chỉ định, thường bôi buổi tối, tránh nắng khi dùng" },
  turmeric_curcumin: { name: "Nghệ / Curcumin (dạng viên liều cao)", aliases: ["nghe", "curcumin"], uses: "Thực phẩm chức năng hỗ trợ tiêu hoá, kháng viêm (dùng theo dân gian/TPCN)", maxDose: "Không có liều chuẩn hoá; khác hẳn nghệ dùng trong ăn uống thông thường" },
  ursodeoxycholic: { name: "Acid ursodeoxycholic (UDCA)", aliases: ["ursosan"], uses: "Điều trị sỏi mật cholesterol, xơ gan mật nguyên phát, bảo vệ gan", maxDose: "13–15 mg/kg/ngày" },
  vaccine_note: { name: "Vắc-xin (nhóm chung, không phải thuốc điều trị)", aliases: ["vaccin", "tiem chung"], uses: "Phòng bệnh — lịch tiêm chủng theo chương trình quốc gia/khuyến cáo", maxDose: "Không áp dụng khái niệm 'liều tối đa'; theo lịch tiêm chuẩn" },
  vancomycin: { name: "Vancomycin", aliases: [], uses: "Kháng sinh glycopeptide (tiêm), nhiễm khuẩn nặng/kháng thuốc", maxDose: "Theo cân nặng & chức năng thận, theo dõi nồng độ đáy" },
  vasopressin: { name: "Vasopressin", aliases: [], uses: "Vận mạch hỗ trợ trong sốc nhiễm khuẩn kháng noradrenaline", maxDose: "Truyền liên tục liều cố định thấp, không chỉnh theo đáp ứng như các vận mạch khác" },
  venlafaxine: { name: "Venlafaxine", aliases: ["effexor"], uses: "Chống trầm cảm (SNRI)", maxDose: "375 mg/ngày" },
  verapamil: { name: "Verapamil", aliases: ["isoptin"], uses: "Hạ áp, chống loạn nhịp (chẹn kênh calci nhóm non-DHP)", maxDose: "480 mg/ngày" },
  vitaminB12: { name: "Vitamin B12 (Cyanocobalamin/Hydroxocobalamin)", aliases: [], uses: "Điều trị thiếu máu hồng cầu to do thiếu B12", maxDose: "Theo phác đồ tiêm bắp, thường 1000 mcg/lần theo lịch giảm dần" },
  vitaminD: { name: "Vitamin D3 (Cholecalciferol)", aliases: [], uses: "Bổ sung vitamin D", maxDose: "4000 IU/ngày (duy trì); liều nạp cao hơn theo phác đồ" },
  vitaminK: { name: "Vitamin K1 (Phytomenadione)", aliases: ["konakion"], uses: "Giải độc/đảo ngược tác dụng warfarin, điều trị thiếu vitamin K", maxDose: "Theo mức độ cần đảo ngược INR, liều thấp nếu không xuất huyết nặng để tránh kháng warfarin trở lại khó khăn" },
  zinc_nhi: { name: "Kẽm (Zinc sulfate, dạng nhi)", aliases: ["zinc"], uses: "Bổ sung trong tiêu chảy cấp ở trẻ em (khuyến cáo WHO)", maxDose: "10 mg/ngày (dưới 6 tháng) hoặc 20 mg/ngày (từ 6 tháng), trong 10–14 ngày" },
  dutasteride: { name: "Dutasteride", aliases: ["avodart"], uses: "Điều trị phì đại tiền liệt tuyến lành tính (ức chế 5-alpha reductase, cùng nhóm finasteride)", maxDose: "0,5 mg/ngày" },
  };

  // ---------- Cơ sở dữ liệu tương tác ----------
  // pair: 2 mã thuốc (không phân biệt thứ tự) — severity: 'nang' | 'trungbinh' | 'nhe'
  const INTERACTIONS = [
    { pair: ["warfarin", "aspirin"], severity: "nang", note: "Tăng đáng kể nguy cơ xuất huyết (cộng hưởng tác dụng chống đông + chống kết tập tiểu cầu). Chỉ phối hợp khi có chỉ định rõ ràng, theo dõi INR & dấu hiệu chảy máu sát." },
    { pair: ["warfarin", "ibuprofen"], severity: "nang", note: "NSAID làm tăng nguy cơ xuất huyết tiêu hoá và có thể làm tăng INR — nên tránh phối hợp, ưu tiên paracetamol để giảm đau." },
    { pair: ["warfarin", "diclofenac"], severity: "nang", note: "Tương tự các NSAID khác: tăng nguy cơ xuất huyết, đặc biệt xuất huyết tiêu hoá." },
    { pair: ["warfarin", "meloxicam"], severity: "nang", note: "Tăng nguy cơ xuất huyết dù meloxicam ức chế COX-2 ưu thế hơn — vẫn cần thận trọng." },
    { pair: ["warfarin", "amiodarone"], severity: "nang", note: "Amiodarone ức chế chuyển hoá warfarin (CYP2C9) → tăng INR rõ rệt, thường cần giảm liều warfarin 30–50%. Theo dõi INR sát khi bắt đầu/ngừng amiodarone." },
    { pair: ["warfarin", "metronidazole"], severity: "nang", note: "Metronidazole ức chế chuyển hoá warfarin → tăng INR, tăng nguy cơ chảy máu. Theo dõi INR trong và sau đợt kháng sinh." },
    { pair: ["warfarin", "ciprofloxacin"], severity: "trungbinh", note: "Fluoroquinolone có thể làm tăng INR — theo dõi INR khi phối hợp." },
    { pair: ["warfarin", "levofloxacin"], severity: "trungbinh", note: "Tương tự ciprofloxacin — có thể làm tăng INR, theo dõi sát." },
    { pair: ["warfarin", "clarithromycin"], severity: "nang", note: "Clarithromycin ức chế CYP3A4 → tăng nồng độ/tác dụng warfarin, tăng INR. Theo dõi sát hoặc cân nhắc kháng sinh thay thế." },
    { pair: ["warfarin", "azithromycin"], severity: "nhe", note: "Nguy cơ tương tác thấp hơn clarithromycin nhưng vẫn nên theo dõi INR nếu dùng đợt kháng sinh." },
    { pair: ["aspirin", "clopidogrel"], severity: "trungbinh", note: "Phối hợp có chủ đích trong hội chứng vành cấp/đặt stent (kháng kết tập tiểu cầu kép), nhưng tăng nguy cơ chảy máu — cần đúng chỉ định và thời gian điều trị." },
    { pair: ["enalapril", "spironolactone"], severity: "nang", note: "Cả 2 đều giữ kali → nguy cơ tăng kali máu nặng, đặc biệt ở người suy thận. Cần theo dõi kali máu và creatinin định kỳ." },
    { pair: ["captopril", "spironolactone"], severity: "nang", note: "Tương tự enalapril — nguy cơ tăng kali máu, theo dõi điện giải sát." },
    { pair: ["losartan", "spironolactone"], severity: "nang", note: "ARB + lợi tiểu giữ kali → tăng nguy cơ tăng kali máu, đặc biệt ở người suy thận/đái tháo đường." },
    { pair: ["valsartan", "spironolactone"], severity: "nang", note: "Tương tự losartan — nguy cơ tăng kali máu." },
    { pair: ["enalapril", "ibuprofen"], severity: "trungbinh", note: "NSAID làm giảm hiệu quả hạ áp của ACEI và có thể ảnh hưởng chức năng thận, đặc biệt khi phối hợp với lợi tiểu (\"triple whammy\")." },
    { pair: ["captopril", "diclofenac"], severity: "trungbinh", note: "Tương tự — NSAID làm giảm hiệu quả ACEI, nguy cơ suy thận cấp nếu phối hợp thêm lợi tiểu." },
    { pair: ["atorvastatin", "clarithromycin"], severity: "nang", note: "Clarithromycin ức chế CYP3A4 mạnh → tăng nồng độ statin, tăng nguy cơ tiêu cơ vân. Cân nhắc ngừng tạm statin trong đợt kháng sinh hoặc đổi kháng sinh khác." },
    { pair: ["simvastatin", "clarithromycin"], severity: "nang", note: "Nguy cơ tiêu cơ vân cao — CHỐNG CHỈ ĐỊNH phối hợp simvastatin với clarithromycin theo nhiều khuyến cáo. Nên tạm ngừng simvastatin trong đợt kháng sinh." },
    { pair: ["simvastatin", "amiodarone"], severity: "nang", note: "Amiodarone ức chế CYP3A4 → tăng nồng độ simvastatin, tăng nguy cơ tiêu cơ vân. Giới hạn liều simvastatin ≤20 mg/ngày khi phối hợp." },
    { pair: ["atorvastatin", "amiodarone"], severity: "trungbinh", note: "Tương tự simvastatin nhưng mức độ nhẹ hơn — vẫn nên thận trọng, theo dõi triệu chứng đau cơ, CK." },
    { pair: ["digoxin", "amiodarone"], severity: "nang", note: "Amiodarone làm tăng nồng độ digoxin (giảm thải trừ qua P-gp) → nguy cơ ngộ độc digoxin. Thường cần giảm liều digoxin khoảng 50% khi bắt đầu amiodarone." },
    { pair: ["digoxin", "furosemide"], severity: "trungbinh", note: "Furosemide gây hạ kali/magie máu → tăng nguy cơ ngộ độc digoxin (loạn nhịp). Theo dõi điện giải định kỳ." },
    { pair: ["digoxin", "spironolactone"], severity: "nhe", note: "Có thể ảnh hưởng đến định lượng digoxin và dược động học nhẹ — nhìn chung ít ý nghĩa lâm sàng nhưng nên lưu ý khi phối hợp trong suy tim." },
    { pair: ["digoxin", "clarithromycin"], severity: "trungbinh", note: "Một số kháng sinh macrolide làm giảm hệ vi khuẩn ruột chuyển hoá digoxin → tăng nồng độ digoxin, nguy cơ ngộ độc." },
    { pair: ["metoprolol", "amiodarone"], severity: "nang", note: "Cộng hưởng ức chế nút xoang/nhĩ thất → nguy cơ nhịp chậm nặng, block nhĩ thất. Theo dõi nhịp tim, cân nhắc giảm liều." },
    { pair: ["propranolol", "amiodarone"], severity: "nang", note: "Tương tự metoprolol — nguy cơ nhịp chậm, block nhĩ thất." },
    { pair: ["theophylline", "ciprofloxacin"], severity: "nang", note: "Ciprofloxacin ức chế CYP1A2 → tăng nồng độ theophylline rõ rệt, nguy cơ ngộ độc (co giật, loạn nhịp). Nên tránh phối hợp hoặc giảm liều theophylline và theo dõi nồng độ." },
    { pair: ["theophylline", "clarithromycin"], severity: "trungbinh", note: "Macrolide ức chế chuyển hoá theophylline → tăng nồng độ, nguy cơ ngộ độc. Theo dõi triệu chứng/nồng độ máu." },
    { pair: ["carbamazepine", "clarithromycin"], severity: "nang", note: "Clarithromycin ức chế CYP3A4 → tăng nồng độ carbamazepine, nguy cơ ngộ độc (chóng mặt, thất điều, buồn nôn). Theo dõi sát hoặc tránh phối hợp." },
    { pair: ["carbamazepine", "erythromycin"], severity: "nang", note: "Tương tự clarithromycin — macrolide ức chế chuyển hoá carbamazepine." },
    { pair: ["sertraline", "tramadol"], severity: "nang", note: "Cả 2 đều tăng serotonin → nguy cơ hội chứng serotonin (kích động, tăng phản xạ, sốt, run). Thận trọng, theo dõi sát nếu bắt buộc phối hợp." },
    { pair: ["fluoxetine", "tramadol"], severity: "nang", note: "Tương tự sertraline — nguy cơ hội chứng serotonin, fluoxetine còn ức chế CYP2D6 làm giảm chuyển hoá tramadol thành dạng có hoạt tính giảm đau (giảm hiệu quả giảm đau, tăng nguy cơ tương tác serotonin)." },
    { pair: ["sertraline", "amitriptyline"], severity: "nang", note: "SSRI ức chế CYP2D6 → tăng nồng độ amitriptyline (nguy cơ độc tính tim mạch, an thần); đồng thời nguy cơ hội chứng serotonin." },
    { pair: ["fluoxetine", "amitriptyline"], severity: "nang", note: "Tương tự sertraline — fluoxetine ức chế CYP2D6 mạnh, tăng nồng độ TCA rõ rệt." },
    { pair: ["tramadol", "amitriptyline"], severity: "trungbinh", note: "Cộng hưởng nguy cơ hội chứng serotonin và hạ ngưỡng co giật — thận trọng, đặc biệt ở người có tiền sử động kinh." },
    { pair: ["methotrexate", "ibuprofen"], severity: "nang", note: "NSAID làm giảm thải trừ methotrexate qua thận → tăng độc tính (ức chế tuỷ xương, độc gan/thận). Đặc biệt nguy hiểm với liều methotrexate cao; thận trọng cả với liều thấp hằng tuần." },
    { pair: ["methotrexate", "diclofenac"], severity: "nang", note: "Tương tự ibuprofen — giảm thải trừ, tăng độc tính methotrexate." },
    { pair: ["methotrexate", "amoxicillin"], severity: "trungbinh", note: "Penicillin có thể làm giảm thải trừ methotrexate qua thận → tăng nồng độ, tăng nguy cơ độc tính. Theo dõi công thức máu, chức năng thận." },
    { pair: ["colchicine", "clarithromycin"], severity: "nang", note: "Clarithromycin ức chế CYP3A4 và P-gp → tăng mạnh nồng độ colchicine, nguy cơ ngộ độc nặng (có thể tử vong), đặc biệt ở người suy thận/gan. Tránh phối hợp hoặc giảm liều colchicine đáng kể." },
    { pair: ["domperidone", "clarithromycin"], severity: "nang", note: "Cả 2 đều kéo dài khoảng QT + clarithromycin ức chế chuyển hoá domperidone → nguy cơ xoắn đỉnh. Tránh phối hợp." },
    { pair: ["domperidone", "azithromycin"], severity: "trungbinh", note: "Nguy cơ kéo dài QT cộng dồn — thận trọng, đặc biệt ở người có bệnh tim mạch/rối loạn điện giải." },
    { pair: ["amiodarone", "ciprofloxacin"], severity: "trungbinh", note: "Cộng hưởng nguy cơ kéo dài khoảng QT — thận trọng ở người có bệnh tim mạch, rối loạn điện giải, theo dõi ECG nếu cần." },
    { pair: ["amiodarone", "levofloxacin"], severity: "trungbinh", note: "Tương tự ciprofloxacin — nguy cơ kéo dài QT cộng dồn." },
    { pair: ["domperidone", "metoclopramide"], severity: "trungbinh", note: "Cùng cơ chế đối kháng dopamine — phối hợp không hợp lý, tăng nguy cơ tác dụng phụ ngoại tháp mà không tăng lợi ích." },
    { pair: ["diazepam", "tramadol"], severity: "nang", note: "Cộng hưởng ức chế thần kinh trung ương/hô hấp — nguy cơ suy hô hấp, an thần quá mức, đặc biệt ở người cao tuổi." },
    { pair: ["alprazolam", "tramadol"], severity: "nang", note: "Tương tự diazepam — nguy cơ ức chế hô hấp khi phối hợp benzodiazepine với opioid." },
    { pair: ["diazepam", "morphine"], severity: "nang", note: "Cộng hưởng ức chế hô hấp/thần kinh trung ương — cảnh báo hộp đen (FDA) khi phối hợp benzodiazepine + opioid." },
    { pair: ["diazepam", "codeine"], severity: "trungbinh", note: "Cộng hưởng an thần, ức chế hô hấp — thận trọng, tránh dùng liều cao/kéo dài." },
    { pair: ["omeprazole", "clopidogrel"], severity: "trungbinh", note: "Omeprazole (đặc biệt) ức chế CYP2C19 → giảm chuyển hoá clopidogrel thành dạng có hoạt tính, có thể giảm hiệu quả chống kết tập tiểu cầu. Nếu cần PPI, cân nhắc pantoprazole/esomeprazole thận trọng hoặc giãn cách thời gian dùng thuốc." },
    { pair: ["esomeprazole", "clopidogrel"], severity: "nhe", note: "Mức độ ức chế CYP2C19 thấp hơn omeprazole nhưng vẫn có thể ảnh hưởng — cân nhắc theo từng bệnh nhân." },
    { pair: ["levothyroxine", "omeprazole"], severity: "nhe", note: "PPI làm giảm độ acid dạ dày → có thể giảm hấp thu levothyroxine. Nên uống levothyroxine lúc đói, cách xa PPI ít nhất 30–60 phút." },
    { pair: ["metformin", "furosemide"], severity: "nhe", note: "Furosemide có thể ảnh hưởng nhẹ đến đường huyết/chức năng thận — theo dõi đường huyết và creatinin, đặc biệt khi có mất nước." },

  // ============================================================
  // DỮ LIỆU TƯƠNG TÁC MỞ RỘNG — dán vào CUỐI mảng INTERACTIONS
  // hiện có (thêm dấu phẩy sau phần tử cuối cùng đang có nếu cần).
  // Tổng: 156 cặp tương tác (đã loại bỏ trùng lặp).
  // ============================================================

  { pair: ["gentamicin", "furosemide"], severity: "nang", note: "Cộng hưởng độc tính trên thận và tai (ototoxic) — đặc biệt nguy hiểm khi dùng liều cao/kéo dài. Theo dõi chức năng thận, thính lực nếu bắt buộc phối hợp." },
  { pair: ["vancomycin", "gentamicin"], severity: "nang", note: "Cộng hưởng độc tính thận (nephrotoxic) rõ rệt — cần theo dõi creatinin sát, hiệu chỉnh liều theo chức năng thận." },
  { pair: ["vancomycin", "furosemide"], severity: "trungbinh", note: "Tăng nguy cơ độc tính tai và thận khi phối hợp — thận trọng ở người cao tuổi, suy thận sẵn có." },
  { pair: ["amikacin", "furosemide"], severity: "nang", note: "Tương tự gentamicin — cộng hưởng độc tính thận và tai." },
  { pair: ["clindamycin", "azithromycin"], severity: "nhe", note: "Đối kháng dược lý tại vị trí gắn ribosome — có thể làm giảm hiệu quả của cả hai, nên tránh phối hợp không cần thiết." },
  { pair: ["linezolid", "sertraline"], severity: "nang", note: "Linezolid có hoạt tính ức chế MAO yếu — phối hợp với SSRI làm tăng nguy cơ hội chứng serotonin. Tránh phối hợp." },
  { pair: ["linezolid", "tramadol"], severity: "nang", note: "Tương tự — nguy cơ hội chứng serotonin khi phối hợp linezolid với thuốc tăng serotonin." },
  { pair: ["insulin", "propranolol"], severity: "trungbinh", note: "Chẹn beta không chọn lọc che lấp triệu chứng hạ đường huyết (run, hồi hộp) khiến bệnh nhân khó nhận biết. Ưu tiên chẹn beta chọn lọc (metoprolol, bisoprolol) nếu cần dùng chung." },
  { pair: ["glimepiride", "fluconazole"], severity: "trungbinh", note: "Fluconazole ức chế CYP2C9 → tăng nồng độ sulfonylurea, tăng nguy cơ hạ đường huyết. Theo dõi đường huyết sát khi phối hợp." },
  { pair: ["pioglitazone", "insulin"], severity: "trungbinh", note: "Phối hợp làm tăng nguy cơ giữ nước, phù, suy tim sung huyết — thận trọng ở người có bệnh tim mạch nền." },
  { pair: ["verapamil", "metoprolol"], severity: "nang", note: "Cộng hưởng ức chế nút xoang/nhĩ thất mạnh → nguy cơ nhịp chậm nặng, block nhĩ thất, hạ huyết áp. Tránh phối hợp đường tĩnh mạch; nếu đường uống cần theo dõi sát." },
  { pair: ["diltiazem", "metoprolol"], severity: "nang", note: "Tương tự verapamil — nguy cơ nhịp chậm, block nhĩ thất khi phối hợp chẹn kênh calci non-DHP với chẹn beta." },
  { pair: ["verapamil", "digoxin"], severity: "trungbinh", note: "Verapamil làm tăng nồng độ digoxin (giảm thải trừ) → nguy cơ ngộ độc. Thường cần giảm liều digoxin khi phối hợp." },
  { pair: ["diltiazem", "simvastatin"], severity: "trungbinh", note: "Diltiazem ức chế CYP3A4 → tăng nồng độ statin, tăng nguy cơ tiêu cơ vân. Giới hạn liều simvastatin khi phối hợp." },
  { pair: ["bisoprolol", "verapamil"], severity: "nang", note: "Cộng hưởng ức chế nút xoang/nhĩ thất — nguy cơ nhịp chậm, block nhĩ thất nặng." },
  { pair: ["rivaroxaban", "diclofenac"], severity: "nang", note: "NSAID làm tăng nguy cơ xuất huyết khi phối hợp với thuốc chống đông thế hệ mới. Tránh phối hợp nếu không thật cần thiết." },
  { pair: ["apixaban", "clarithromycin"], severity: "nang", note: "Clarithromycin ức chế CYP3A4/P-gp → tăng nồng độ apixaban, tăng nguy cơ chảy máu." },
  { pair: ["dabigatran", "amiodarone"], severity: "trungbinh", note: "Amiodarone ức chế P-gp → tăng nồng độ dabigatran, tăng nguy cơ chảy máu. Có thể cần giảm liều." },
  { pair: ["rivaroxaban", "rifampicin"], severity: "nang", note: "Rifampicin cảm ứng mạnh CYP3A4/P-gp → giảm rõ rệt nồng độ và hiệu quả chống đông của rivaroxaban. Tránh phối hợp." },
  { pair: ["rifampicin", "warfarin"], severity: "nang", note: "Rifampicin cảm ứng mạnh CYP2C9 → giảm rõ rệt tác dụng warfarin, cần tăng liều đáng kể và theo dõi INR sát khi bắt đầu/ngừng rifampicin." },
  { pair: ["rifampicin", "metoprolol"], severity: "trungbinh", note: "Rifampicin cảm ứng chuyển hoá → giảm nồng độ/tác dụng chẹn beta. Có thể cần tăng liều hoặc theo dõi đáp ứng lâm sàng." },
  { pair: ["isoniazid", "phenytoin"], severity: "trungbinh", note: "Isoniazid ức chế chuyển hoá phenytoin → tăng nồng độ, nguy cơ ngộ độc (chóng mặt, thất điều). Theo dõi nồng độ/triệu chứng." },
  { pair: ["rifampicin", "fluconazole"], severity: "nhe", note: "Rifampicin cảm ứng chuyển hoá fluconazole → có thể giảm hiệu quả kháng nấm. Theo dõi đáp ứng lâm sàng." },
  { pair: ["isoniazid", "carbamazepine"], severity: "trungbinh", note: "Isoniazid ức chế chuyển hoá carbamazepine → tăng nồng độ, nguy cơ ngộ độc." },
  { pair: ["itraconazole", "simvastatin"], severity: "nang", note: "Ức chế CYP3A4 mạnh → tăng nồng độ statin rõ rệt, nguy cơ tiêu cơ vân cao. Tránh phối hợp, tạm ngừng statin trong đợt kháng nấm." },
  { pair: ["itraconazole", "digoxin"], severity: "trungbinh", note: "Itraconazole ức chế P-gp → tăng nồng độ digoxin, nguy cơ ngộ độc. Theo dõi triệu chứng/nồng độ digoxin." },
  { pair: ["ketoconazole", "simvastatin"], severity: "nang", note: "Tương tự itraconazole — ức chế CYP3A4 mạnh, nguy cơ tiêu cơ vân cao." },
  { pair: ["fluconazole", "simvastatin"], severity: "trungbinh", note: "Fluconazole ức chế CYP3A4 (yếu hơn itraconazole/ketoconazole) — vẫn tăng nguy cơ tiêu cơ vân, thận trọng khi phối hợp." },
  { pair: ["lithium", "furosemide"], severity: "nang", note: "Lợi tiểu quai làm giảm thải trừ lithium qua thận → tăng nồng độ, nguy cơ ngộ độc lithium (run, lú lẫn, co giật). Theo dõi nồng độ lithium sát." },
  { pair: ["lithium", "enalapril"], severity: "nang", note: "ACEI làm giảm thải trừ lithium → tăng nồng độ, nguy cơ ngộ độc. Theo dõi nồng độ lithium khi bắt đầu/ngừng ACEI." },
  { pair: ["lithium", "diclofenac"], severity: "trungbinh", note: "NSAID làm giảm thải trừ lithium qua thận → tăng nồng độ. Theo dõi nồng độ lithium nếu dùng NSAID kéo dài." },
  { pair: ["haloperidol", "domperidone"], severity: "trungbinh", note: "Cộng hưởng nguy cơ kéo dài khoảng QT và tác dụng phụ ngoại tháp." },
  { pair: ["quetiapine", "clarithromycin"], severity: "trungbinh", note: "Clarithromycin ức chế CYP3A4 → tăng nồng độ quetiapine, tăng nguy cơ an thần quá mức, hạ huyết áp tư thế." },
  { pair: ["olanzapine", "diazepam"], severity: "trungbinh", note: "Cộng hưởng an thần, ức chế hô hấp/tim mạch — thận trọng đặc biệt khi dùng đường tiêm." },
  { pair: ["gabapentin", "morphine"], severity: "trungbinh", note: "Cộng hưởng ức chế thần kinh trung ương/hô hấp — thận trọng, đặc biệt ở người cao tuổi hoặc suy hô hấp." },
  { pair: ["pregabalin", "tramadol"], severity: "trungbinh", note: "Cộng hưởng an thần và ức chế hô hấp — thận trọng khi phối hợp, đặc biệt liều cao." },
  { pair: ["venlafaxine", "tramadol"], severity: "nang", note: "Cộng hưởng nguy cơ hội chứng serotonin — cả hai đều tăng serotonin." },
  { pair: ["mirtazapine", "tramadol"], severity: "trungbinh", note: "Nguy cơ hội chứng serotonin khi phối hợp — thận trọng, theo dõi triệu chứng." },
  { pair: ["etoricoxib", "warfarin"], severity: "nang", note: "Tương tự các NSAID khác — tăng nguy cơ xuất huyết khi phối hợp với warfarin." },
  { pair: ["piroxicam", "warfarin"], severity: "nang", note: "NSAID làm tăng nguy cơ xuất huyết tiêu hoá, tăng INR — nên tránh phối hợp." },
  { pair: ["etodolac", "enalapril"], severity: "trungbinh", note: "NSAID làm giảm hiệu quả hạ áp của ACEI và có thể ảnh hưởng chức năng thận." },
  { pair: ["alendronate", "calcium"], severity: "nhe", note: "Canxi làm giảm hấp thu alendronate nếu uống cùng lúc — nên uống alendronate lúc đói, cách xa canxi ít nhất 30 phút." },
  { pair: ["levothyroxine", "calcium"], severity: "nhe", note: "Canxi làm giảm hấp thu levothyroxine — nên uống cách nhau ít nhất 4 giờ." },
  { pair: ["methotrexate_hd", "ibuprofen"], severity: "nang", note: "NSAID làm giảm thải trừ methotrexate liều cao qua thận → tăng độc tính nặng (ức chế tuỷ xương, độc gan/thận, có thể đe doạ tính mạng). Thường phải ngừng NSAID hoàn toàn trong đợt hoá trị MTX liều cao. Cần bác sĩ chuyên khoa ung bướu quyết định." },
  { pair: ["cyclophosphamide", "allopurinol"], severity: "trungbinh", note: "Allopurinol có thể làm tăng độc tính huyết học của cyclophosphamide. Cần theo dõi công thức máu sát khi phối hợp." },
  { pair: ["doxorubicin", "verapamil"], severity: "trungbinh", note: "Verapamil có thể làm tăng nồng độ nội bào và độc tính tim của doxorubicin. Thận trọng ở bệnh nhân có nguy cơ tim mạch, cần theo dõi chức năng tim (siêu âm tim/EF)." },
  { pair: ["cisplatin", "gentamicin"], severity: "nang", note: "Cộng hưởng độc tính thận và tai nghiêm trọng — hai thuốc đều độc thận/tai mạnh. Tránh phối hợp nếu có thể; nếu bắt buộc cần theo dõi sát chức năng thận và thính lực." },
  { pair: ["cisplatin", "furosemide"], severity: "trungbinh", note: "Cộng hưởng nguy cơ độc tính tai (ototoxic) — cần cân nhắc kỹ khi phối hợp, đặc biệt dùng furosemide liều cao/tiêm nhanh." },
  { pair: ["fluorouracil", "warfarin"], severity: "nang", note: "5-FU có thể làm tăng đáng kể tác dụng chống đông của warfarin (tăng INR) — cần theo dõi INR sát trong và sau đợt hoá trị." },
  { pair: ["tamoxifen", "fluoxetine"], severity: "trungbinh", note: "Fluoxetine ức chế CYP2D6 mạnh → giảm chuyển hoá tamoxifen thành dạng có hoạt tính (endoxifen), có thể giảm hiệu quả điều trị ung thư vú. Ưu tiên SSRI ít ức chế CYP2D6 hơn (ví dụ sertraline liều thấp, citalopram) nếu cần chống trầm cảm đồng thời." },
  { pair: ["tamoxifen", "warfarin"], severity: "trungbinh", note: "Tamoxifen có thể làm tăng tác dụng chống đông của warfarin — theo dõi INR sát khi bắt đầu/ngừng tamoxifen." },
  { pair: ["ondansetron", "amiodarone"], severity: "trungbinh", note: "Cộng hưởng nguy cơ kéo dài khoảng QT — cả hai đều có nguy cơ QT kéo dài, thận trọng ở bệnh nhân có bệnh tim mạch/rối loạn điện giải." },
  { pair: ["ondansetron", "tramadol"], severity: "nhe", note: "Ondansetron có thể làm giảm nhẹ hiệu quả giảm đau của tramadol (đối kháng một phần trên thụ thể serotonin liên quan) — theo dõi hiệu quả giảm đau lâm sàng." },
  { pair: ["ibuprofen_nhi", "paracetamol_nhi"], severity: "nhe", note: "Thường được phối hợp luân phiên để hạ sốt ở trẻ (theo một số phác đồ), nhưng cần đúng liều lượng và khoảng cách giữa các lần dùng để tránh nhầm lẫn liều — nên ghi rõ giờ dùng từng loại cho phụ huynh." },
  { pair: ["domperidone_nhi", "salbutamol_nhi"], severity: "nhe", note: "Nguy cơ tương tác thấp ở liều điều trị thông thường, nhưng cả hai đều có thể ảnh hưởng nhịp tim — thận trọng ở trẻ có bệnh tim bẩm sinh." },
  { pair: ["amoxicillin_nhi", "oresol"], severity: "nhe", note: "Không có tương tác dược lý đáng kể — có thể dùng cùng lúc, đây là phối hợp phổ biến trong điều trị tiêu chảy nhiễm khuẩn ở trẻ." },
  { pair: ["oxytocin", "methylergometrine"], severity: "trungbinh", note: "Cộng hưởng tác dụng co tử cung — thường phối hợp có chủ đích trong xử trí băng huyết sau sinh nhưng cần theo dõi huyết áp sát, đặc biệt vì methylergometrine có thể gây tăng huyết áp." },
  { pair: ["methylergometrine", "labetalol"], severity: "trungbinh", note: "Methylergometrine có thể gây tăng huyết áp — cộng thêm labetalol (dùng cho tăng huyết áp thai kỳ) cần theo dõi huyết áp sát để tránh dao động lớn." },
  { pair: ["magnesium_sulfate_sp", "nifedipine_sp"], severity: "nang", note: "Cộng hưởng ức chế thần kinh cơ và hạ huyết áp khi phối hợp MgSO4 với nifedipine (cả hai đều là chẹn kênh calci về mặt sinh lý) — nguy cơ yếu cơ nặng, hạ huyết áp quá mức. Cần theo dõi sát phản xạ gân xương, huyết áp, nhịp thở." },
  { pair: ["magnesium_sulfate_sp", "gentamicin"], severity: "trungbinh", note: "Magnesium có thể tăng cường tác dụng ức chế thần kinh cơ của aminoglycoside — thận trọng ở bệnh nhân có nguy cơ suy hô hấp." },
  { pair: ["misoprostol", "oxytocin"], severity: "trungbinh", note: "Cộng hưởng tác dụng co tử cung — nếu phối hợp cần theo dõi cơn co và tim thai sát, tránh cường co tử cung (tachysystole)." },
  { pair: ["ironSupplement", "levothyroxine"], severity: "nhe", note: "Sắt làm giảm hấp thu levothyroxine nếu uống cùng lúc — nên uống cách nhau ít nhất 4 giờ." },
  { pair: ["folicAcid", "phenytoin"], severity: "nhe", note: "Acid folic liều cao có thể làm giảm nhẹ nồng độ phenytoin — theo dõi nếu bệnh nhân động kinh đang mang thai cần cả hai." },
  { pair: ["propofol", "fentanyl"], severity: "trungbinh", note: "Cộng hưởng ức chế hô hấp và hạ huyết áp — đây là phối hợp thường dùng có chủ đích trong gây mê nhưng cần theo dõi sát huyết động, sẵn sàng hỗ trợ hô hấp." },
  { pair: ["succinylcholine", "neostigmine"], severity: "nang", note: "Neostigmine có thể kéo dài/tăng cường phong bế thần kinh cơ của succinylcholine (tương tác phức tạp qua ức chế cholinesterase huyết tương) — KHÔNG dùng neostigmine để giải giãn cơ do succinylcholine." },
  { pair: ["rocuronium", "gentamicin"], severity: "trungbinh", note: "Aminoglycoside tăng cường tác dụng giãn cơ không khử cực — có thể kéo dài thời gian hồi phục sau mổ, cần theo dõi sát." },
  { pair: ["bupivacaine", "lidocaine"], severity: "trungbinh", note: "Cộng hưởng độc tính toàn thân (tim mạch, thần kinh trung ương) khi phối hợp 2 thuốc tê tại chỗ — cần tính tổng liều độc quy đổi, không vượt ngưỡng an toàn." },
  { pair: ["atropine", "neostigmine"], severity: "nhe", note: "Phối hợp có chủ đích để giải giãn cơ (neostigmine kèm atropine/glycopyrrolate chống tác dụng phụ cường phó giao cảm như nhịp chậm) — đây là phối hợp chuẩn, không phải tương tác bất lợi." },
  { pair: ["ketamine", "propofol"], severity: "nhe", note: "Phối hợp có chủ đích (\"ketofol\") giúp giảm tác dụng phụ tim mạch/hô hấp của từng thuốc riêng lẻ — cần bác sĩ gây mê có kinh nghiệm điều chỉnh tỷ lệ." },
  { pair: ["cefazolin", "vancomycin"], severity: "nhe", note: "Có thể phối hợp trong dự phòng phẫu thuật ở bệnh nhân dị ứng beta-lactam hoặc nguy cơ MRSA cao — không có tương tác bất lợi đáng kể, nhưng cần chỉ định đúng đối tượng." },
  { pair: ["noradrenaline_icu", "dobutamine"], severity: "nhe", note: "Phối hợp thường dùng có chủ đích trong sốc tim kèm giãn mạch — noradrenaline duy trì huyết áp, dobutamine tăng co bóp. Cần theo dõi huyết động liên tục (không phải tương tác bất lợi mà là phối hợp điều trị)." },
  { pair: ["vasopressin", "noradrenaline_icu"], severity: "nhe", note: "Phối hợp chuẩn trong sốc nhiễm khuẩn kháng trị — vasopressin thường thêm vào khi liều noradrenaline cao, giúp giảm liều catecholamine. Đây là phối hợp điều trị, cần theo dõi tưới máu ngoại vi." },
  { pair: ["amiodarone", "noradrenaline_icu"], severity: "nhe", note: "Không có tương tác dược động học đáng kể trực tiếp, nhưng cả hai ảnh hưởng huyết động — cần theo dõi ECG và huyết áp khi phối hợp ở bệnh nhân loạn nhịp có sốc." },
  { pair: ["heparin_ivi", "streptokinase"], severity: "nang", note: "Cộng hưởng nguy cơ xuất huyết nghiêm trọng — heparin thường được trì hoãn một khoảng thời gian sau tiêu sợi huyết theo phác đồ cụ thể, không dùng đồng thời tuỳ tiện." },
  { pair: ["heparin_ivi", "aspirin"], severity: "trungbinh", note: "Phối hợp có chủ đích trong hội chứng vành cấp nhưng tăng nguy cơ chảy máu — cần theo dõi aPTT và dấu hiệu xuất huyết sát." },
  { pair: ["midazolam_icu", "fentanyl"], severity: "trungbinh", note: "Cộng hưởng ức chế hô hấp và an thần sâu — phối hợp phổ biến trong an thần thở máy nhưng cần theo dõi sát, đặc biệt khi cai thở máy." },
  { pair: ["digoxin", "amiodarone"], severity: "nang", note: "Đã có trong dữ liệu trước — nhắc lại vì thường gặp trong bối cảnh ICU khi xử trí rung nhĩ có suy tim." },
  { pair: ["sevelamer", "levothyroxine"], severity: "nhe", note: "Sevelamer có thể làm giảm hấp thu levothyroxine — nên uống cách nhau ít nhất 4 giờ." },
  { pair: ["calcitriol", "calcium"], severity: "trungbinh", note: "Cộng hưởng nguy cơ tăng canxi máu khi phối hợp — cần theo dõi canxi máu định kỳ ở bệnh nhân suy thận mạn dùng cả hai." },
  { pair: ["kayexalate", "sodium_bicarbonate"], severity: "nhe", note: "Không tương tác bất lợi trực tiếp — thường phối hợp trong xử trí toan chuyển hoá kèm tăng kali máu ở suy thận mạn." },
  { pair: ["spironolactone", "kayexalate"], severity: "nhe", note: "Về mặt logic lâm sàng, spironolactone (giữ kali) và kayexalate (thải kali) có tác dụng đối lập — nếu bệnh nhân đang tăng kali máu cần dùng kayexalate, nên xem xét tạm ngừng spironolactone." },
  { pair: ["enalapril", "kayexalate"], severity: "nhe", note: "Tương tự spironolactone — ACEI góp phần gây tăng kali, nên đánh giá lại việc tiếp tục ACEI khi bệnh nhân cần điều trị tăng kali máu cấp." },
  { pair: ["timolol_eye", "metoprolol"], severity: "trungbinh", note: "Timolol nhỏ mắt vẫn hấp thu toàn thân đáng kể — cộng hưởng với chẹn beta đường uống có thể gây nhịp chậm, hạ huyết áp quá mức. Thận trọng đặc biệt ở người có bệnh tim mạch/hen." },
  { pair: ["timolol_eye", "verapamil"], severity: "trungbinh", note: "Tương tự — cộng hưởng ức chế nút xoang/nhĩ thất khi phối hợp timolol nhỏ mắt với chẹn kênh calci non-DHP đường toàn thân." },
  { pair: ["prednisolone_eye", "timolol_eye"], severity: "nhe", note: "Không tương tác dược động học trực tiếp, nhưng corticoid nhỏ mắt kéo dài có thể làm tăng nhãn áp — cần theo dõi nhãn áp sát khi phối hợp điều trị glaucoma." },
  { pair: ["atropine_eye", "domperidone"], severity: "nhe", note: "Atropine nhỏ mắt hấp thu toàn thân thường không đáng kể ở liều điều trị, nhưng ở trẻ nhỏ/dùng lặp lại cần thận trọng với các thuốc ảnh hưởng nhu động ruột như domperidone." },
  { pair: ["oxymetazoline", "amitriptyline"], severity: "nhe", note: "Cả hai có tác dụng giao cảm/kháng cholinergic nhẹ — dùng oxymetazoline kéo dài kèm thuốc chống trầm cảm 3 vòng có thể tăng nguy cơ tăng huyết áp nhẹ. Tránh dùng oxymetazoline quá 3-5 ngày là biện pháp quan trọng hơn." },
  { pair: ["betahistine", "loratadine"], severity: "nhe", note: "Không có tương tác dược động học đáng kể — có thể phối hợp trong điều trị chóng mặt kèm triệu chứng dị ứng." },
  { pair: ["fluticasone_nasal", "budesonide"], severity: "nhe", note: "Nếu bệnh nhân dùng đồng thời corticoid xịt mũi và corticoid hít (hen/COPD), tổng liều corticoid hấp thu toàn thân cộng dồn — thận trọng khi dùng kéo dài, đặc biệt ở trẻ em (ảnh hưởng tăng trưởng)." },
  { pair: ["ciprofloxacin_ear", "ciprofloxacin"], severity: "nhe", note: "Nếu bệnh nhân đang dùng ciprofloxacin đường uống mà lại dùng thêm dạng nhỏ tai, tổng lượng hấp thu toàn thân từ nhỏ tai thường không đáng kể — chủ yếu cần tránh nhầm lẫn liều giữa hai dạng bào chế." },
  { pair: ["dapagliflozin", "furosemide"], severity: "trungbinh", note: "Cộng hưởng nguy cơ mất nước, hạ huyết áp và tổn thương thận cấp — cả hai đều gây lợi niệu. Theo dõi thể tích tuần hoàn, chức năng thận, đặc biệt ở người cao tuổi." },
  { pair: ["empagliflozin", "insulin"], severity: "nhe", note: "Phối hợp phổ biến trong điều trị đái tháo đường nhưng tăng nguy cơ hạ đường huyết — có thể cần giảm liều insulin khi bắt đầu SGLT2i." },
  { pair: ["methimazole", "warfarin"], severity: "nhe", note: "Điều chỉnh chức năng tuyến giáp có thể ảnh hưởng đến chuyển hoá warfarin — theo dõi INR khi chức năng giáp thay đổi (cường giáp → bình giáp làm giảm nhu cầu warfarin)." },
  { pair: ["hydrocortisone", "fluconazole"], severity: "nhe", note: "Fluconazole có thể ức chế nhẹ chuyển hoá corticosteroid — theo dõi triệu chứng nếu dùng phối hợp kéo dài." },
  { pair: ["spironolactone_gan", "enalapril"], severity: "nang", note: "Cộng hưởng nguy cơ tăng kali máu nặng ở bệnh nhân xơ gan — đặc biệt nguy hiểm nếu kèm suy thận. Theo dõi kali máu sát." },
  { pair: ["propranolol_gan", "verapamil"], severity: "nang", note: "Cộng hưởng ức chế nút xoang/nhĩ thất và hạ huyết áp — nguy cơ đặc biệt cao ở bệnh nhân xơ gan có tuần hoàn tăng động, thận trọng tối đa." },
  { pair: ["rifaximin", "warfarin"], severity: "nhe", note: "Rifaximin hấp thu toàn thân tối thiểu nhưng có thể ảnh hưởng hệ vi khuẩn ruột tổng hợp vitamin K — theo dõi INR nếu dùng kéo dài." },
  { pair: ["lactulose_gan", "furosemide"], severity: "nhe", note: "Cả hai có thể gây mất nước/rối loạn điện giải nếu dùng liều cao — theo dõi điện giải, đặc biệt kali, ở bệnh nhân xơ gan dùng đồng thời." },
  { pair: ["pantoprazole_gan", "clopidogrel"], severity: "trungbinh", note: "PPI liều cao trong xuất huyết tiêu hoá cấp vẫn có thể làm giảm hoạt hoá clopidogrel qua CYP2C19 — cân nhắc bối cảnh lâm sàng cụ thể (ưu tiên kiểm soát xuất huyết trước)." },
  { pair: ["vitaminK", "warfarin"], severity: "nhe", note: "Đây là thuốc giải độc có chủ đích khi cần đảo ngược tác dụng warfarin (quá liều, xuất huyết) — không phải tương tác bất lợi cần tránh, mà là xử trí chuẩn." },
  { pair: ["protamine", "heparin_ivi"], severity: "nhe", note: "Thuốc giải độc có chủ đích để trung hoà heparin — dùng khi cần đảo ngược nhanh tác dụng chống đông (xuất huyết, trước phẫu thuật cấp cứu)." },
  { pair: ["tranexamic", "warfarin"], severity: "trungbinh", note: "Acid tranexamic đối kháng một phần tác dụng chống đông của warfarin qua cơ chế khác nhau — có thể làm tăng nguy cơ huyết khối nếu phối hợp không đúng chỉ định. Cân nhắc kỹ trước khi dùng đồng thời." },
  { pair: ["tranexamic", "rivaroxaban"], severity: "trungbinh", note: "Tương tự warfarin — nguy cơ tăng huyết khối khi phối hợp thuốc cầm máu kháng tiêu sợi huyết với thuốc chống đông đường uống thế hệ mới. Cần chỉ định rõ ràng." },
  { pair: ["ferrous_iv", "amoxicillin"], severity: "nhe", note: "Sắt tiêm tĩnh mạch không có tương tác hấp thu qua đường tiêu hoá (khác sắt uống) — an toàn khi phối hợp kháng sinh đường uống." },
  { pair: ["hydroxychloroquine", "amiodarone"], severity: "trungbinh", note: "Cộng hưởng nguy cơ kéo dài khoảng QT — cả hai đều có nguy cơ QT kéo dài, cần theo dõi ECG nếu phối hợp kéo dài." },
  { pair: ["azathioprine", "allopurinol"], severity: "nang", note: "Allopurinol ức chế xanthine oxidase — enzyme chuyển hoá chính của azathioprine — làm tăng mạnh nồng độ, nguy cơ ức chế tuỷ xương nặng. Nếu bắt buộc phối hợp, cần giảm liều azathioprine xuống còn khoảng 25% và theo dõi công thức máu rất sát." },
  { pair: ["leflunomide", "methotrexate"], severity: "nang", note: "Cộng hưởng độc tính gan khi phối hợp 2 DMARD — cần theo dõi men gan sát, tránh phối hợp nếu có tiền sử bệnh gan." },
  { pair: ["cyclosporine", "diltiazem"], severity: "trungbinh", note: "Diltiazem ức chế CYP3A4 → tăng nồng độ cyclosporine, có thể cần giảm liều. Theo dõi nồng độ cyclosporine máu." },
  { pair: ["cyclosporine", "clarithromycin"], severity: "nang", note: "Clarithromycin ức chế CYP3A4 mạnh → tăng đáng kể nồng độ cyclosporine, nguy cơ độc thận. Theo dõi nồng độ máu sát hoặc tránh phối hợp." },
  { pair: ["sulfasalazine", "warfarin"], severity: "nhe", note: "Có thể ảnh hưởng hệ vi khuẩn ruột tổng hợp vitamin K — theo dõi INR nếu dùng kéo dài." },
  { pair: ["efavirenz", "rifampicin"], severity: "trungbinh", note: "Tương tác 2 chiều qua CYP450 — thường cần điều chỉnh liều efavirenz khi phối hợp điều trị lao đồng thời HIV. Cần theo phác đồ chuẩn HIV-lao, không tự ý phối hợp." },
  { pair: ["dolutegravir", "calcium"], severity: "trungbinh", note: "Các cation đa hoá trị (canxi, sắt, magie) làm giảm hấp thu dolutegravir đáng kể — cần uống cách xa nhau ít nhất 2 giờ (trước) hoặc 6 giờ (sau)." },
  { pair: ["dolutegravir", "ferrous_iv"], severity: "nhe", note: "Sắt tiêm tĩnh mạch không ảnh hưởng hấp thu đường uống — khác với sắt uống (xem tương tác với canxi ở trên áp dụng cho sắt uống)." },
  { pair: ["lopinavir_ritonavir", "simvastatin"], severity: "nang", note: "Ritonavir ức chế CYP3A4 rất mạnh → tăng nồng độ simvastatin cực cao, nguy cơ tiêu cơ vân nghiêm trọng. CHỐNG CHỈ ĐỊNH phối hợp — nếu cần statin, chuyển sang loại ít tương tác hơn (ví dụ pravastatin) theo hướng dẫn chuyên khoa HIV." },
  { pair: ["lopinavir_ritonavir", "midazolam_icu"], severity: "nang", note: "Ritonavir ức chế CYP3A4 mạnh → tăng đáng kể nồng độ và thời gian tác dụng midazolam, nguy cơ an thần quá mức, ức chế hô hấp kéo dài." },
  { pair: ["tenofovir", "gentamicin"], severity: "trungbinh", note: "Cộng hưởng độc tính thận — cả hai đều có khả năng gây độc ống thận. Tránh phối hợp nếu có thể, theo dõi chức năng thận sát nếu bắt buộc." },
  { pair: ["entecavir", "tenofovir"], severity: "nhe", note: "Không có tương tác dược động học đáng kể nhưng thường không cần phối hợp cả hai cho viêm gan B (chọn 1 trong 2 theo phác đồ, trừ trường hợp đặc biệt kháng thuốc)." },
  { pair: ["sofosbuvir", "amiodarone"], severity: "nang", note: "Phối hợp sofosbuvir (đặc biệt với daclatasvir) và amiodarone có báo cáo gây nhịp chậm nặng, có thể đe doạ tính mạng — tránh phối hợp; nếu bắt buộc cần theo dõi tim mạch sát tại cơ sở có giám sát liên tục." },
  { pair: ["tiotropium", "ipratropium"], severity: "nhe", note: "Cả hai đều kháng cholinergic — phối hợp không hợp lý, tăng tác dụng phụ (khô miệng, bí tiểu) mà không tăng lợi ích đáng kể. Thường chỉ dùng 1 loại." },
  { pair: ["formoterol", "propranolol"], severity: "trungbinh", note: "Chẹn beta không chọn lọc đối kháng trực tiếp tác dụng giãn phế quản của formoterol — tránh phối hợp ở bệnh nhân COPD/hen, ưu tiên chẹn beta chọn lọc nếu thật cần thiết." },
  { pair: ["roflumilast", "theophylline"], severity: "trungbinh", note: "Cộng hưởng tác dụng phụ tiêu hoá và thần kinh (buồn nôn, đau đầu) — thận trọng khi phối hợp 2 thuốc cùng nhóm ức chế enzyme liên quan chuyển hoá purine." },
  { pair: ["naloxone", "morphine"], severity: "nhe", note: "Đây là thuốc giải độc có chủ đích khi opioid gây quá liều/ức chế hô hấp — không phải tương tác cần tránh. Lưu ý: thời gian tác dụng naloxone ngắn hơn nhiều opioid, cần theo dõi tái ức chế hô hấp sau khi hết tác dụng naloxone." },
  { pair: ["flumazenil", "diazepam"], severity: "nhe", note: "Thuốc giải độc có chủ đích khi benzodiazepine gây quá liều — không phải tương tác cần tránh. Thận trọng ở người nghiện benzodiazepine mạn tính (nguy cơ co giật khi giải độc đột ngột)." },
  { pair: ["activatedCharcoal", "paracetamol"], severity: "nhe", note: "Than hoạt dùng để hấp phụ paracetamol trong ngộ độc cấp (uống trong vòng 1-2 giờ đầu) — đây là xử trí chuẩn, không phải tương tác bất lợi." },
  { pair: ["atropine_ngodoc", "pralidoxime"], severity: "nhe", note: "Phối hợp chuẩn trong giải độc phospho hữu cơ — atropine đối kháng triệu chứng cholinergic, pralidoxime tái hoạt hoá enzyme. Đây là phác đồ điều trị, không phải tương tác cần tránh." },
  { pair: ["glucagon_ngodoc", "insulin"], severity: "nhe", note: "Khi dùng glucagon liều cao giải độc chẹn beta/kênh calci, cần theo dõi đường huyết sát vì glucagon cũng có tác dụng tăng đường huyết — có thể cần điều chỉnh insulin nếu bệnh nhân đái tháo đường đi kèm." },
  { pair: ["intralipid", "bupivacaine"], severity: "nhe", note: "Nhũ dịch lipid là thuốc giải độc có chủ đích khi ngộ độc thuốc tê tại chỗ nặng (\"lipid rescue\") — không phải tương tác cần tránh, là phác đồ cấp cứu chuẩn." },
  { pair: ["sildenafil", "isosorbide"], severity: "nang", note: "⚠️ CHỐNG CHỈ ĐỊNH TUYỆT ĐỐI. Cộng hưởng giãn mạch cực mạnh qua cơ chế NO/cGMP → tụt huyết áp nặng, có thể tử vong. TUYỆT ĐỐI không phối hợp thuốc ức chế PDE-5 (sildenafil, tadalafil...) với bất kỳ dạng nitrat nào (kể cả nitroglycerin ngậm dưới lưỡi cấp cứu đau thắt ngực)." },
  { pair: ["sildenafil", "nitroglycerin"], severity: "nang", note: "⚠️ CHỐNG CHỈ ĐỊNH TUYỆT ĐỐI — tương tự isosorbide, nguy cơ tụt huyết áp nặng đe doạ tính mạng. Luôn hỏi bệnh nhân có dùng thuốc cường dương trong 24-48 giờ trước khi cho nitrat cấp cứu." },
  { pair: ["tadalafil", "isosorbide"], severity: "nang", note: "⚠️ CHỐNG CHỈ ĐỊNH TUYỆT ĐỐI — tadalafil có thời gian tác dụng dài hơn sildenafil (đến 36 giờ), nguy cơ tương tác với nitrat kéo dài hơn tương ứng." },
  { pair: ["sildenafil", "doxazosin"], severity: "trungbinh", note: "Cộng hưởng hạ huyết áp khi phối hợp ức chế PDE-5 với chẹn alpha điều trị tăng huyết áp/phì đại tiền liệt tuyến — nguy cơ hạ huyết áp tư thế. Nên giãn cách thời gian dùng hoặc dùng liều thấp thận trọng." },
  { pair: ["sildenafil", "tamsulosin"], severity: "nhe", note: "Tamsulosin chọn lọc alpha-1A hơn nên nguy cơ hạ huyết áp thấp hơn doxazosin, nhưng vẫn nên thận trọng theo dõi khi phối hợp lần đầu." },
  { pair: ["finasteride", "dutasteride"], severity: "nhe", note: "Cùng nhóm ức chế 5-alpha reductase — phối hợp không hợp lý, không tăng lợi ích mà tăng tác dụng phụ." },
  { pair: ["oxybutynin", "amitriptyline"], severity: "trungbinh", note: "Cộng hưởng tác dụng kháng cholinergic (khô miệng, táo bón, bí tiểu, lú lẫn ở người cao tuổi) — đặc biệt thận trọng ở bệnh nhân cao tuổi." },
  { pair: ["rivaroxaban_ck", "celecoxib_ck"], severity: "trungbinh", note: "Dù celecoxib ít ảnh hưởng tiểu cầu hơn NSAID không chọn lọc, phối hợp với thuốc chống đông vẫn tăng nguy cơ xuất huyết tiêu hoá — cần đánh giá lợi ích/nguy cơ theo từng bệnh nhân." },
  { pair: ["enoxaparin_ck", "aspirin"], severity: "trungbinh", note: "Cộng hưởng nguy cơ chảy máu khi phối hợp dự phòng huyết khối với chống kết tập tiểu cầu — thường gặp ở bệnh nhân có bệnh mạch vành cần cả hai, cần cân nhắc kỹ và theo dõi sát." },
  { pair: ["calcitonin", "calcium"], severity: "nhe", note: "Không tương tác bất lợi — thường phối hợp trong điều trị loãng xương/gãy xương, cần đảm bảo đủ canxi nền khi dùng calcitonin." },
  { pair: ["isotretinoin", "tetracycline"], severity: "nang", note: "Cộng hưởng nguy cơ tăng áp lực nội sọ lành tính (giả u não) — CHỐNG CHỈ ĐỊNH phối hợp isotretinoin với các kháng sinh nhóm tetracycline (bao gồm doxycycline)." },
  { pair: ["isotretinoin", "doxycycline"], severity: "nang", note: "Tương tự tetracycline — nguy cơ tăng áp lực nội sọ lành tính khi phối hợp, cần tránh." },
  { pair: ["isotretinoin", "vitaminD"], severity: "nhe", note: "Isotretinoin là dẫn xuất vitamin A liều cao — dùng đồng thời thêm vitamin A/các retinoid khác (không phải vitamin D) mới là nguy cơ chính; ghi chú này để nhắc kiểm tra bệnh nhân có tự dùng thêm vitamin A liều cao không." },
  { pair: ["methotrexate_dalieu", "tretinoin"], severity: "nhe", note: "Không có tương tác toàn thân đáng kể đường bôi ngoài da, nhưng cần theo dõi kích ứng da tại chỗ nếu phối hợp." },
  { pair: ["clobetasol", "ketoconazole_boi"], severity: "nhe", note: "Có thể phối hợp trong điều trị viêm da tiết bã có bội nhiễm nấm — không có tương tác bất lợi đáng kể tại chỗ." },
  { pair: ["desmopressin", "furosemide"], severity: "trungbinh", note: "Desmopressin có tác dụng chống lợi niệu (giữ nước) — phối hợp với furosemide (lợi tiểu) có tác dụng đối lập, cần theo dõi natri máu và cân bằng dịch, đặc biệt tránh hạ natri máu khi dùng desmopressin kéo dài." },
  { pair: ["desmopressin", "spironolactone"], severity: "nhe", note: "Tương tự furosemide nhưng mức độ tương tác thấp hơn — vẫn nên theo dõi natri máu nếu phối hợp kéo dài." },
  { pair: ["ginseng", "warfarin"], severity: "trungbinh", note: "Nhân sâm có thể ảnh hưởng đến tác dụng chống đông của warfarin theo cả hai chiều (một số nghiên cứu cho thấy giảm INR, một số cho thấy tăng nguy cơ chảy máu) — dữ liệu không nhất quán. Khuyến cáo thận trọng: nên hỏi kỹ bệnh nhân đang dùng warfarin có tự ý dùng nhân sâm không, theo dõi INR sát hơn nếu có." },
  { pair: ["ginseng", "insulin"], severity: "nhe", note: "Một số nghiên cứu gợi ý nhân sâm có thể có tác dụng hạ đường huyết nhẹ — cộng hưởng với insulin/thuốc hạ đường huyết có thể tăng nguy cơ hạ đường huyết. Theo dõi đường huyết nếu bệnh nhân tự dùng thêm." },
  { pair: ["gingko", "warfarin"], severity: "trungbinh", note: "Bạch quả có tác dụng ức chế kết tập tiểu cầu nhẹ (qua ginkgolide B) — cộng hưởng với warfarin làm tăng nguy cơ xuất huyết. Nên hỏi bệnh nhân về việc dùng TPCN này, đặc biệt trước phẫu thuật." },
  { pair: ["gingko", "aspirin"], severity: "nhe", note: "Cộng hưởng nhẹ tác dụng ức chế tiểu cầu — tăng nguy cơ chảy máu, đặc biệt khi phối hợp kéo dài hoặc trước phẫu thuật." },
  { pair: ["garlic_supplement", "warfarin"], severity: "trungbinh", note: "Tỏi liều cao (dạng viên/chiết xuất, khác tỏi ăn thông thường) có thể có tác dụng chống kết tập tiểu cầu — cộng hưởng với warfarin tăng nguy cơ chảy máu. Hỏi bệnh nhân về TPCN đang dùng, đặc biệt trước phẫu thuật." },
  { pair: ["garlic_supplement", "aspirin"], severity: "nhe", note: "Tương tự — cộng hưởng nhẹ tác dụng chống kết tập tiểu cầu khi dùng tỏi liều cao (TPCN) cùng aspirin." },
  { pair: ["turmeric_curcumin", "warfarin"], severity: "trungbinh", note: "Curcumin liều cao có thể ức chế kết tập tiểu cầu và ảnh hưởng chuyển hoá thuốc qua CYP450 — cộng hưởng với warfarin có thể tăng nguy cơ chảy máu. Nên hỏi bệnh nhân về TPCN nghệ/curcumin đang dùng." },
  { pair: ["fishOil", "warfarin"], severity: "trungbinh", note: "Omega-3 liều cao có tác dụng chống kết tập tiểu cầu nhẹ — cộng hưởng với warfarin/thuốc chống đông có thể tăng nguy cơ chảy máu, đặc biệt ở liều TPCN cao (>3 g/ngày)." },
  { pair: ["fishOil", "clopidogrel"], severity: "nhe", note: "Tương tự warfarin — cộng hưởng nhẹ nguy cơ chảy máu khi phối hợp omega-3 liều cao với thuốc chống kết tập tiểu cầu." },
  { pair: ["ginger_supplement", "warfarin"], severity: "nhe", note: "Gừng liều cao (dạng viên/chiết xuất) có thể có tác dụng chống kết tập tiểu cầu nhẹ — cộng hưởng với warfarin tăng nhẹ nguy cơ chảy máu. Mức độ bằng chứng còn hạn chế so với ginkgo/tỏi." },
  { pair: ["mannitol", "furosemide"], severity: "nhe", note: "Thường phối hợp có chủ đích trong xử trí phù não/tăng áp lực nội sọ để tăng hiệu quả lợi niệu — cần theo dõi điện giải và thể tích tuần hoàn sát." },
  { pair: ["articaine", "lidocaine"], severity: "nhe", note: "Nếu phối hợp nhiều loại thuốc tê trong cùng buổi điều trị nha khoa, cần tính tổng liều độc toàn thân quy đổi, không vượt ngưỡng an toàn cộng dồn." },
  ];

  // ---------- Tiện ích ----------
  function normalize(str) {
    return String(str || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9]+/g, "")
      .trim();
  }

  // Xây chỉ mục tìm kiếm: mỗi biến thể tên (đã chuẩn hoá) -> {source, key}
  // source 'local'  = có trong CSDL rút gọn tiếng Việt (đầy đủ công dụng/liều)
  // source 'bulk'   = chỉ có trong DDInter 2.0 (chỉ có tên + mức độ tương tác, chưa dịch)
  const SEARCH_INDEX = [];
  const SEEN_NORM = new Set();
  Object.keys(DRUGS).forEach((key) => {
    const d = DRUGS[key];
    const names = [d.name, ...(d.aliases || []), key];
    names.forEach((n) => {
      const norm = normalize(n);
      SEARCH_INDEX.push({ norm, source: "local", key });
      SEEN_NORM.add(norm);
    });
  });

  // ---------- CSDL mở rộng: DDInter 2.0 (nạp từ /ddinter-data.js nếu có) ----------
  // Nguồn: https://ddinter2.scbdd.com — giấy phép CC BY-NC-SA 4.0.
  // Chỉ gồm tên thuốc (tiếng Anh/quốc tế) + mức độ tương tác (0-3), KHÔNG có mô tả cơ chế.
  const DDI_BULK = (window.DDINTER_DATA && Array.isArray(window.DDINTER_DATA.drugs)) ? window.DDINTER_DATA : { drugs: [], pairs: [] };
  const DDI_NAME_TO_IDX = {};
  DDI_BULK.drugs.forEach((name, idx) => {
    const norm = normalize(name);
    DDI_NAME_TO_IDX[norm] = idx;
    if (!SEEN_NORM.has(norm)) {
      SEARCH_INDEX.push({ norm, source: "bulk", key: idx });
      SEEN_NORM.add(norm);
    }
  });
  const DDI_PAIR_SEV = {}; // "idxNhỏ_idxLớn" -> mức độ (0-3)
  DDI_BULK.pairs.forEach((p) => {
    const a = p[0], b = p[1], s = p[2];
    const k = a < b ? a + "_" + b : b + "_" + a;
    DDI_PAIR_SEV[k] = s;
  });
  const BULK_SEV_MAP = { 0: null, 1: "nhe", 2: "trungbinh", 3: "nang" }; // 0=chưa phân loại -> bỏ qua

  function findDrug(query) {
    const q = normalize(query);
    if (!q) return null;
    // Ưu tiên: khớp đúng tuyệt đối > khớp đầu chuỗi > khớp chuỗi con — và trong mỗi
    // mức, ưu tiên nguồn 'local' (có đủ công dụng/liều) trước nguồn 'bulk'.
    const bySource = (a, b) => (a.source === b.source ? 0 : a.source === "local" ? -1 : 1);
    let candidates = SEARCH_INDEX.filter((e) => e.norm === q);
    if (!candidates.length) candidates = SEARCH_INDEX.filter((e) => e.norm.indexOf(q) === 0);
    if (!candidates.length) candidates = SEARCH_INDEX.filter((e) => e.norm.indexOf(q) !== -1);
    if (!candidates.length) return null;
    candidates.sort(bySource);
    return { source: candidates[0].source, key: candidates[0].key };
  }

  function drugDisplayName(entry) {
    return entry.source === "local" ? DRUGS[entry.key].name : DDI_BULK.drugs[entry.key];
  }

  function suggestDrugs(query, limit) {
    const q = normalize(query);
    if (!q) return [];
    const seenKey = new Set();
    const out = [];
    SEARCH_INDEX.forEach((e) => {
      if (out.length >= (limit || 8)) return;
      const dedupeKey = e.source + ":" + e.key;
      if (seenKey.has(dedupeKey)) return;
      if (e.norm.indexOf(q) !== -1) {
        seenKey.add(dedupeKey);
        out.push({ source: e.source, key: e.key });
      }
    });
    return out;
  }

  function findInteraction(keyA, keyB) {
    return INTERACTIONS.find(
      (i) =>
        (i.pair[0] === keyA && i.pair[1] === keyB) ||
        (i.pair[0] === keyB && i.pair[1] === keyA)
    );
  }

  // Tra cứu mức độ (severity-only) trong DDInter 2.0 — dùng khi CSDL nội bộ không có
  // sẵn giải thích cho cặp thuốc này. entryA/entryB là {source,key} từ findDrug().
  function findBulkSeverity(entryA, entryB) {
    const normA = entryA.source === "local" ? normalize(DRUGS[entryA.key].name) : normalize(DDI_BULK.drugs[entryA.key]);
    const normB = entryB.source === "local" ? normalize(DRUGS[entryB.key].name) : normalize(DDI_BULK.drugs[entryB.key]);
    const idxA = DDI_NAME_TO_IDX[normA];
    const idxB = DDI_NAME_TO_IDX[normB];
    if (idxA === undefined || idxB === undefined) return null;
    const k = idxA < idxB ? idxA + "_" + idxB : idxB + "_" + idxA;
    const raw = DDI_PAIR_SEV[k];
    if (raw === undefined) return null;
    const severity = BULK_SEV_MAP[raw];
    return severity ? { severity } : null;
  }

  const SEVERITY_LABEL = { nang: "⛔ Nghiêm trọng", trungbinh: "⚠️ Trung bình", nhe: "ℹ️ Nhẹ / cần lưu ý" };
  const SEVERITY_CLASS = { nang: "ddi-sev-nang", trungbinh: "ddi-sev-trungbinh", nhe: "ddi-sev-nhe" };

  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function drugCardHTML(entry) {
    if (entry.source === "local") {
      const d = DRUGS[entry.key];
      return (
        '<div class="ddi-drug-card">' +
        '<div class="ddi-drug-name">' + esc(d.name) + "</div>" +
        '<div class="ddi-drug-row"><b>Công dụng:</b> ' + esc(d.uses) + "</div>" +
        '<div class="ddi-drug-row"><b>Liều tối đa (người lớn, tham khảo):</b> ' + esc(d.maxDose) + "</div>" +
        "</div>"
      );
    }
    // Nguồn 'bulk' (DDInter): chỉ có tên, chưa có công dụng/liều trong CSDL rút gọn.
    const name = DDI_BULK.drugs[entry.key];
    return (
      '<div class="ddi-drug-card ddi-drug-bulk">' +
      '<div class="ddi-drug-name">' + esc(name) + "</div>" +
      '<div class="ddi-drug-row ddi-drug-bulk-note">Nhận diện được tên thuốc (theo DDInter 2.0), nhưng trang chưa có sẵn công dụng/liều tối đa tiếng Việt cho thuốc này. Xem phần tra cứu mở rộng bên dưới.</div>' +
      "</div>"
    );
  }

  function notFoundCardHTML(rawText) {
    return (
      '<div class="ddi-drug-card ddi-drug-notfound">' +
      "Không tìm thấy <b>“" + esc(rawText) + "”</b> trong cơ sở dữ liệu rút gọn. " +
      "Vui lòng kiểm tra lại chính tả, thử tên hoạt chất, hoặc xem thêm ở phần tra cứu mở rộng bên dưới." +
      "</div>"
    );
  }

  // ---------- Tra cứu mở rộng: nhãn thuốc FDA (openFDA) qua worker /ddi ----------
  const DDI_API = "https://bsdha-usage-tracker.dhabolero.workers.dev/ddi";
  let ddiRequestToken = 0;

  function extendedLoadingHTML() {
    return (
      '<div class="ddi-extended ddi-extended-loading" id="ddiExtendedBox">' +
      "🔎 Đang tra cứu mở rộng từ nhãn thuốc FDA (Hoa Kỳ, tiếng Anh)…" +
      "</div>"
    );
  }

  function extendedQuoteHTML(item, labelFallbackName) {
    const label = esc(item.labelName || labelFallbackName);
    if (item.excerptVi) {
      // Có bản dịch: hiện bản Việt trước, kèm nút bấm xem bản gốc tiếng Anh.
      const idSuffix = Math.random().toString(36).slice(2, 8);
      return (
        '<div class="ddi-extended-item">' +
        '<div class="ddi-extended-src">Trích nhãn thuốc FDA của ' + label + ' (đã dịch tự động):</div>' +
        '<div class="ddi-extended-quote">"' + esc(item.excerptVi) + '"</div>' +
        '<button type="button" class="ddi-extended-toggle" data-target="ddiOrig' + idSuffix + '">Xem bản gốc tiếng Anh</button>' +
        '<div class="ddi-extended-quote ddi-extended-orig" id="ddiOrig' + idSuffix + '">"' + esc(item.excerpt) + '"</div>' +
        "</div>"
      );
    }
    // Dịch thất bại/hết quota: hiện thẳng bản gốc tiếng Anh, ghi rõ lý do.
    return (
      '<div class="ddi-extended-item">' +
      '<div class="ddi-extended-src">Trích nhãn thuốc FDA của ' + label + ' (chưa dịch được — hiển thị bản gốc tiếng Anh):</div>' +
      '<div class="ddi-extended-quote">"' + esc(item.excerpt) + '"</div>' +
      "</div>"
    );
  }

  function extendedResultHTML(data, nameA, nameB) {
    const parts = [];
    if (data.a.mentionsOther) parts.push(extendedQuoteHTML(data.a, nameA));
    if (data.b.mentionsOther) parts.push(extendedQuoteHTML(data.b, nameB));

    if (parts.length) {
      return (
        '<div class="ddi-extended ddi-extended-found">' +
        '<div class="ddi-extended-title">📄 Tra cứu mở rộng — nhãn thuốc FDA (Hoa Kỳ)</div>' +
        parts.join("") +
        '<div class="ddi-extended-disclaimer">Trích từ nhãn thuốc được FDA phê duyệt, dịch tự động theo yêu cầu tra cứu (không lưu vào cơ sở dữ liệu, không qua biên tập y khoa). Chỉ mang tính tham khảo bổ sung, không thay thế đánh giá lâm sàng.</div>' +
        "</div>"
      );
    }

    const noneFound = !data.a.foundLabel && !data.b.foundLabel;
    return (
      '<div class="ddi-extended ddi-extended-empty">' +
      "📄 Tra cứu mở rộng (FDA): " +
      (noneFound
        ? "không tìm thấy nhãn thuốc phù hợp cho 1 hoặc cả 2 tên đã nhập (có thể do tên viết khác chuẩn quốc tế, hoặc thuốc không lưu hành tại Hoa Kỳ)."
        : "không thấy đoạn nào trong nhãn thuốc FDA nhắc trực tiếp tới thuốc còn lại. Không đồng nghĩa với việc chắc chắn an toàn khi phối hợp.") +
      "</div>"
    );
  }

  function runExtendedLookup(rawA, rawB) {
    const box = document.getElementById("ddiExtendedBox");
    if (!box) return;
    const myToken = ++ddiRequestToken;

    fetch(DDI_API + "?a=" + encodeURIComponent(rawA) + "&b=" + encodeURIComponent(rawB))
      .then((r) => r.json())
      .then((data) => {
        if (myToken !== ddiRequestToken) return; // người dùng đã đổi ô nhập, kết quả này đã cũ
        const box2 = document.getElementById("ddiExtendedBox");
        if (!box2) return;
        if (!data || !data.ok) {
          box2.outerHTML = '<div class="ddi-extended ddi-extended-empty">📄 Tra cứu mở rộng (FDA): hiện không thể truy vấn, vui lòng thử lại sau.</div>';
          return;
        }
        box2.outerHTML = extendedResultHTML(data, rawA, rawB);
      })
      .catch(() => {
        if (myToken !== ddiRequestToken) return;
        const box2 = document.getElementById("ddiExtendedBox");
        if (box2) box2.outerHTML = '<div class="ddi-extended ddi-extended-empty">📄 Tra cứu mở rộng (FDA): hiện không thể truy vấn (lỗi mạng), vui lòng thử lại sau.</div>';
      });
  }

  function render(resultEl, rawA, rawB) {
    if (!rawA.trim() && !rawB.trim()) {
      resultEl.innerHTML = "";
      resultEl.classList.remove("show");
      ddiRequestToken++; // huỷ mọi kết quả tra cứu mở rộng đang chờ
      return;
    }

    const entryA = rawA.trim() ? findDrug(rawA) : null;
    const entryB = rawB.trim() ? findDrug(rawB) : null;

    let html = '<div class="ddi-drug-grid">';
    html += rawA.trim() ? (entryA ? drugCardHTML(entryA) : notFoundCardHTML(rawA)) : "";
    html += rawB.trim() ? (entryB ? drugCardHTML(entryB) : notFoundCardHTML(rawB)) : "";
    html += "</div>";

    if (entryA && entryB) {
      if (typeof logUsage === 'function') logUsage('ddi_check');
      if (entryA.source === entryB.source && entryA.key === entryB.key) {
        html += '<div class="ddi-interaction ddi-sev-nhe">Hai ô đang trùng cùng 1 thuốc — hãy nhập 2 thuốc khác nhau để kiểm tra tương tác.</div>';
      } else {
        // Ưu tiên 1: CSDL nội bộ tiếng Việt (chỉ áp dụng khi cả 2 đều là thuốc 'local').
        const inter = (entryA.source === "local" && entryB.source === "local") ? findInteraction(entryA.key, entryB.key) : null;
        if (inter) {
          html +=
            '<div class="ddi-interaction ' + SEVERITY_CLASS[inter.severity] + '">' +
            '<div class="ddi-interaction-title">' + SEVERITY_LABEL[inter.severity] + " — Có tương tác giữa " + esc(drugDisplayName(entryA)) + " và " + esc(drugDisplayName(entryB)) + "</div>" +
            '<div class="ddi-interaction-note">' + esc(inter.note) + "</div>" +
            "</div>";
        } else {
          // Ưu tiên 2: CSDL mở rộng DDInter 2.0 — chỉ có mức độ, không có giải thích cơ chế.
          const bulk = findBulkSeverity(entryA, entryB);
          if (bulk) {
            html +=
              '<div class="ddi-interaction ' + SEVERITY_CLASS[bulk.severity] + '">' +
              '<div class="ddi-interaction-title">' + SEVERITY_LABEL[bulk.severity] + " — Có tương tác giữa " + esc(drugDisplayName(entryA)) + " và " + esc(drugDisplayName(entryB)) + " (theo DDInter 2.0)</div>" +
              '<div class="ddi-interaction-note">Cơ sở dữ liệu DDInter 2.0 ghi nhận mức độ tương tác này nhưng không kèm mô tả cơ chế/xử trí chi tiết. Xem phần tra cứu mở rộng (nhãn thuốc FDA) bên dưới để biết thêm chi tiết, hoặc đối chiếu Dược thư Quốc gia Việt Nam.</div>' +
              "</div>";
          } else {
            html +=
              '<div class="ddi-interaction ddi-sev-none">' +
              "Không tìm thấy tương tác đáng chú ý giữa <b>" + esc(drugDisplayName(entryA)) + "</b> và <b>" + esc(drugDisplayName(entryB)) + "</b> trong dữ liệu rút gọn này. " +
              "Điều này KHÔNG có nghĩa là chắc chắn không có tương tác — hãy đối chiếu thêm với Dược thư Quốc gia Việt Nam hoặc dược sĩ lâm sàng nếu cần." +
              "</div>";
          }
        }
      }
    }

    resultEl.innerHTML = html;
    resultEl.classList.add("show");

    // Luôn gọi tra cứu mở rộng (openFDA) khi đã nhập đủ 2 tên khác nhau — kể cả khi
    // 1 hoặc cả 2 thuốc không có trong CSDL nội bộ, vì openFDA tra theo tên trực tiếp.
    if (rawA.trim() && rawB.trim() && normalize(rawA) !== normalize(rawB)) {
      resultEl.insertAdjacentHTML("beforeend", extendedLoadingHTML());
      runExtendedLookup(rawA.trim(), rawB.trim());
    } else {
      ddiRequestToken++; // huỷ kết quả tra cứu mở rộng cũ nếu không còn đủ điều kiện gọi
    }
  }

  function setupSuggest(inputEl, listEl, onPick, onEnterNoSelection) {
    let matches = [];
    let activeIdx = -1;

    function close() {
      listEl.innerHTML = "";
      listEl.classList.remove("show");
      matches = [];
      activeIdx = -1;
    }

    function itemLabel(e) {
      return e.source === "local" ? DRUGS[e.key].name : DDI_BULK.drugs[e.key];
    }

    function renderList() {
      listEl.innerHTML = matches
        .map((e, i) => {
          const tag = e.source === "bulk" ? ' <span class="ddi-suggest-tag">DDInter</span>' : "";
          const activeCls = i === activeIdx ? " active" : "";
          return '<div class="ddi-suggest-item' + activeCls + '" data-idx="' + i + '">' + esc(itemLabel(e)) + tag + "</div>";
        })
        .join("");
      listEl.classList.add("show");
      const activeEl = listEl.querySelector(".ddi-suggest-item.active");
      if (activeEl) activeEl.scrollIntoView({ block: "nearest" });
    }

    function pick(idx) {
      const e = matches[idx];
      if (!e) return;
      inputEl.value = itemLabel(e);
      close();
      onPick();
    }

    inputEl.addEventListener("input", () => {
      matches = suggestDrugs(inputEl.value, 8);
      activeIdx = -1;
      if (!matches.length) return close();
      renderList();
    });

    inputEl.addEventListener("keydown", (e) => {
      if (matches.length && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        e.preventDefault();
        activeIdx = e.key === "ArrowDown" ? Math.min(activeIdx + 1, matches.length - 1) : Math.max(activeIdx - 1, 0);
        renderList();
        return;
      }
      if (matches.length && e.key === "Escape") {
        close();
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (matches.length && activeIdx >= 0) {
          pick(activeIdx);
        } else {
          close();
          if (onEnterNoSelection) onEnterNoSelection();
        }
      }
    });

    listEl.addEventListener("mousedown", (e) => {
      const item = e.target.closest(".ddi-suggest-item");
      if (!item) return;
      e.preventDefault();
      pick(Number(item.dataset.idx));
    });
    listEl.addEventListener("mousemove", (e) => {
      const item = e.target.closest(".ddi-suggest-item");
      if (!item) return;
      const idx = Number(item.dataset.idx);
      if (idx !== activeIdx) {
        activeIdx = idx;
        listEl.querySelectorAll(".ddi-suggest-item").forEach((el, i) => el.classList.toggle("active", i === activeIdx));
      }
    });
    inputEl.addEventListener("blur", () => setTimeout(close, 120));
    inputEl.addEventListener("focus", () => {
      if (inputEl.value.trim()) inputEl.dispatchEvent(new Event("input"));
    });
  }

  function init() {
    const inputA = document.getElementById("ddiDrugA");
    const inputB = document.getElementById("ddiDrugB");
    const suggestA = document.getElementById("ddiSuggestA");
    const suggestB = document.getElementById("ddiSuggestB");
    const resultEl = document.getElementById("ddiResult");
    const btn = document.getElementById("ddiCheckBtn");
    const infoBtn = document.getElementById("ddiInfoBtn");
    const infoPopover = document.getElementById("ddiInfoPopover");
    if (!inputA || !inputB || !resultEl) return; // trang chưa có trên DOM, bỏ qua

    if (infoBtn && infoPopover) {
      infoBtn.addEventListener("click", () => infoPopover.classList.toggle("show"));
    }

    resultEl.addEventListener("click", (e) => {
      const toggleBtn = e.target.closest(".ddi-extended-toggle");
      if (!toggleBtn) return;
      const target = document.getElementById(toggleBtn.dataset.target);
      if (!target) return;
      const showing = target.classList.toggle("show");
      toggleBtn.textContent = showing ? "Ẩn bản gốc tiếng Anh" : "Xem bản gốc tiếng Anh";
    });

    function check() {
      render(resultEl, inputA.value, inputB.value);
    }

    setupSuggest(inputA, suggestA, check, () => {
      if (!inputB.value.trim()) inputB.focus();
      else check();
    });
    setupSuggest(inputB, suggestB, check, check);

    if (btn) btn.addEventListener("click", check);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
