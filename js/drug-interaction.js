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

  // Xây chỉ mục tìm kiếm: mỗi biến thể tên (đã chuẩn hoá) -> mã thuốc
  const SEARCH_INDEX = [];
  Object.keys(DRUGS).forEach((key) => {
    const d = DRUGS[key];
    const names = [d.name, ...(d.aliases || []), key];
    names.forEach((n) => {
      SEARCH_INDEX.push({ norm: normalize(n), key });
    });
  });

  function findDrug(query) {
    const q = normalize(query);
    if (!q) return null;
    // Ưu tiên khớp đúng tuyệt đối, sau đó khớp chuỗi con
    let hit = SEARCH_INDEX.find((e) => e.norm === q);
    if (!hit) hit = SEARCH_INDEX.find((e) => e.norm.indexOf(q) === 0);
    if (!hit) hit = SEARCH_INDEX.find((e) => e.norm.indexOf(q) !== -1);
    return hit ? hit.key : null;
  }

  function suggestDrugs(query, limit) {
    const q = normalize(query);
    if (!q) return [];
    const seen = new Set();
    const out = [];
    SEARCH_INDEX.forEach((e) => {
      if (out.length >= (limit || 8)) return;
      if (seen.has(e.key)) return;
      if (e.norm.indexOf(q) !== -1) {
        seen.add(e.key);
        out.push(e.key);
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

  const SEVERITY_LABEL = { nang: "⛔ Nghiêm trọng", trungbinh: "⚠️ Trung bình", nhe: "ℹ️ Nhẹ / cần lưu ý" };
  const SEVERITY_CLASS = { nang: "ddi-sev-nang", trungbinh: "ddi-sev-trungbinh", nhe: "ddi-sev-nhe" };

  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function drugCardHTML(key) {
    const d = DRUGS[key];
    return (
      '<div class="ddi-drug-card">' +
      '<div class="ddi-drug-name">' + esc(d.name) + "</div>" +
      '<div class="ddi-drug-row"><b>Công dụng:</b> ' + esc(d.uses) + "</div>" +
      '<div class="ddi-drug-row"><b>Liều tối đa (người lớn, tham khảo):</b> ' + esc(d.maxDose) + "</div>" +
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

    const keyA = rawA.trim() ? findDrug(rawA) : null;
    const keyB = rawB.trim() ? findDrug(rawB) : null;

    let html = '<div class="ddi-drug-grid">';
    html += rawA.trim() ? (keyA ? drugCardHTML(keyA) : notFoundCardHTML(rawA)) : "";
    html += rawB.trim() ? (keyB ? drugCardHTML(keyB) : notFoundCardHTML(rawB)) : "";
    html += "</div>";

    if (keyA && keyB) {
      if (keyA === keyB) {
        html += '<div class="ddi-interaction ddi-sev-nhe">Hai ô đang trùng cùng 1 thuốc — hãy nhập 2 thuốc khác nhau để kiểm tra tương tác.</div>';
      } else {
        const inter = findInteraction(keyA, keyB);
        if (inter) {
          html +=
            '<div class="ddi-interaction ' + SEVERITY_CLASS[inter.severity] + '">' +
            '<div class="ddi-interaction-title">' + SEVERITY_LABEL[inter.severity] + " — Có tương tác giữa " + esc(DRUGS[keyA].name) + " và " + esc(DRUGS[keyB].name) + "</div>" +
            '<div class="ddi-interaction-note">' + esc(inter.note) + "</div>" +
            "</div>";
        } else {
          html +=
            '<div class="ddi-interaction ddi-sev-none">' +
            "Không tìm thấy tương tác đáng chú ý giữa <b>" + esc(DRUGS[keyA].name) + "</b> và <b>" + esc(DRUGS[keyB].name) + "</b> trong dữ liệu rút gọn này. " +
            "Điều này KHÔNG có nghĩa là chắc chắn không có tương tác — hãy đối chiếu thêm với Dược thư Quốc gia Việt Nam hoặc dược sĩ lâm sàng nếu cần." +
            "</div>";
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

  function setupSuggest(inputEl, listEl, onPick) {
    function close() {
      listEl.innerHTML = "";
      listEl.classList.remove("show");
    }
    inputEl.addEventListener("input", () => {
      const matches = suggestDrugs(inputEl.value, 8);
      if (!matches.length) return close();
      listEl.innerHTML = matches
        .map((k) => '<div class="ddi-suggest-item" data-key="' + k + '">' + esc(DRUGS[k].name) + "</div>")
        .join("");
      listEl.classList.add("show");
    });
    listEl.addEventListener("mousedown", (e) => {
      const item = e.target.closest(".ddi-suggest-item");
      if (!item) return;
      e.preventDefault();
      inputEl.value = DRUGS[item.dataset.key].name;
      close();
      onPick();
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
    if (!inputA || !inputB || !resultEl) return; // trang chưa có trên DOM, bỏ qua

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

    setupSuggest(inputA, suggestA, check);
    setupSuggest(inputB, suggestB, check);

    inputA.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (!inputB.value.trim()) inputB.focus();
        else check();
      }
    });
    inputB.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        check();
      }
    });
    if (btn) btn.addEventListener("click", check);

    if (typeof window.logUsage === "function") {
      // Ghi nhận lượt dùng nếu worker đã hỗ trợ action này (bỏ qua im lặng nếu chưa).
      // Xem README/worker.js: thêm "tuongtac_check" vào ALLOWED_ACTIONS nếu muốn thống kê.
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
