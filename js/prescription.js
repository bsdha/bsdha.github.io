(function () {
  const $ = (id) => document.getElementById(id);

  // ---------- Popup tuỳ chỉnh (thay cho prompt()/confirm() mặc định của trình duyệt) ----------
  // ======================================================================
  // PHẦN 1: POPUP TUỲ CHỈNH (thay prompt/confirm/alert mặc định)
  // ======================================================================
  function ensureModalRoot() {
    let root = document.getElementById('rxModalRoot');
    if (!root) {
      root = document.createElement('div');
      root.id = 'rxModalRoot';
      document.body.appendChild(root);
    }
    return root;
  }
  function customModal({ title, message, showInput, inputValue, inputPlaceholder, okText, cancelText, okOnly }) {
    return new Promise((resolve) => {
      const root = ensureModalRoot();
      const overlay = document.createElement('div');
      overlay.className = 'rx-modal-overlay';
      overlay.innerHTML = `
        <div class="rx-modal-box" role="dialog" aria-modal="true">
          <div class="rx-modal-title">${escapeHtml(title || '')}</div>
          ${message ? `<div class="rx-modal-message">${escapeHtml(message)}</div>` : ''}
          ${showInput ? `<input type="text" class="rx-modal-input" placeholder="${escapeHtml(inputPlaceholder || '')}">` : ''}
          <div class="rx-modal-actions">
            ${okOnly ? '' : `<button type="button" class="rx-modal-btn rx-modal-cancel">${escapeHtml(cancelText || 'Huỷ')}</button>`}
            <button type="button" class="rx-modal-btn rx-modal-ok">${escapeHtml(okText || 'Đồng ý')}</button>
          </div>
        </div>`;
      root.appendChild(overlay);
      const input = overlay.querySelector('.rx-modal-input');
      const okBtn = overlay.querySelector('.rx-modal-ok');
      const cancelBtn = overlay.querySelector('.rx-modal-cancel');
      if (input) { input.value = inputValue || ''; setTimeout(() => { input.focus(); input.select(); }, 30); }
      else { setTimeout(() => okBtn.focus(), 30); }
      function close(result) {
        overlay.remove();
        resolve(result);
      }
      okBtn.addEventListener('click', () => close(showInput ? (input.value || '').trim() : true));
      if (cancelBtn) cancelBtn.addEventListener('click', () => close(showInput ? null : false));
      overlay.addEventListener('click', (e) => { if (e.target === overlay && !okOnly) close(showInput ? null : false); });
      if (input) {
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') { e.preventDefault(); close((input.value || '').trim()); }
          else if (e.key === 'Escape') { e.preventDefault(); close(null); }
        });
      }
      document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape' && document.body.contains(overlay)) {
          document.removeEventListener('keydown', escHandler);
          if (!okOnly) close(showInput ? null : false);
        }
      });
    });
  }
  function customPrompt(title, placeholder, defaultValue) {
    return customModal({ title, showInput: true, inputValue: defaultValue, inputPlaceholder: placeholder, okText: 'Thêm', cancelText: 'Huỷ' });
  }
  function customConfirm(title, message) {
    return customModal({ title, message, okText: 'Đồng ý', cancelText: 'Huỷ' });
  }
  function customAlert(title, message) {
    return customModal({ title, message, okText: 'Đã hiểu', okOnly: true });
  }
  const LS_ORG1 = 'rxOrgLine1', LS_ORG2 = 'rxOrgLine2', LS_LOGO = 'rxOrgLogo', LS_LOGO_SIZE = 'rxOrgLogoSize';
  const LS_DRUGS = 'rxLocalDrugs';
  const LS_ADMIN_PW = 'rxAdminPw';
  const DEFAULT_ADMIN_PW = 'KKB2-DHA';
  const ADMIN_EMAIL = 'dhabolero@gmail.com';
  const ADMIN_PHONE = '+84868919790';
  // Supabase dùng chung cố định cho toàn bộ công cụ (không cần cấu hình lại trên từng máy)
  const SUPABASE_URL = 'https://bihsqhjyobbktzmwnbdx.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpaHNxaGp5b2Jia3R6bXduYmR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMjgwNTgsImV4cCI6MjEwMDkwNDA1OH0.UZxojIHCrd8D8vUI6f-TWqZX_qmZjPJXlNT5ljn4Gp0';
  const LS_DOCTORS = 'rxDoctorList', LS_DOCTOR_DEFAULT = 'rxDoctorDefault';
  const LS_DRUGS_OUTSIDE = 'rxLocalDrugsOutside';
  const LS_RX_MODE = 'rxPrescribeMode';

  // ======================================================================
  // Danh mục thuốc khởi điểm cho chế độ "Kê đơn ngoài Bệnh viện"
  // Dùng tên gốc/hoạt chất (INN) phổ biến theo nhiều nhóm bệnh — an toàn, không
  // gắn tên thương mại cụ thể (vì tên biệt dược lưu hành thực tế thay đổi theo
  // từng thời điểm/nhà cung cấp). Bác sĩ có thể nạp thêm file Excel riêng của
  // phòng khám (mục "Cấu hình" ở trên) để bổ sung tên thương mại đang dùng.
  // ======================================================================
  const DEFAULT_OUTSIDE_DRUGS = (function () {
    const groups = {
      'Giảm đau - hạ sốt - kháng viêm': [
        ['Paracetamol', '500mg', 'viên'], ['Ibuprofen', '400mg', 'viên'], ['Diclofenac', '50mg', 'viên'], ['Meloxicam', '7.5mg', 'viên'],
        ['Celecoxib', '200mg', 'viên'], ['Naproxen', '250mg', 'viên'], ['Piroxicam', '20mg', 'viên'], ['Aspirin', '81mg', 'viên'],
        ['Tramadol', '50mg', 'viên'], ['Paracetamol + Codein', '500mg/30mg', 'viên'], ['Etoricoxib', '90mg', 'viên'],
      ],
      'Kháng sinh': [
        ['Amoxicillin', '500mg', 'viên'], ['Amoxicillin + Acid clavulanic', '625mg', 'viên'], ['Ampicillin', '500mg', 'viên'],
        ['Cephalexin', '500mg', 'viên'], ['Cefuroxime', '500mg', 'viên'], ['Cefixime', '200mg', 'viên'], ['Cefpodoxime', '200mg', 'viên'],
        ['Ceftriaxone', '1g', 'ống'], ['Azithromycin', '500mg', 'viên'], ['Clarithromycin', '500mg', 'viên'], ['Erythromycin', '500mg', 'viên'],
        ['Doxycycline', '100mg', 'viên'], ['Ciprofloxacin', '500mg', 'viên'], ['Levofloxacin', '500mg', 'viên'], ['Moxifloxacin', '400mg', 'viên'],
        ['Metronidazole', '250mg', 'viên'], ['Tinidazole', '500mg', 'viên'], ['Clindamycin', '300mg', 'viên'],
        ['Sulfamethoxazole + Trimethoprim (Cotrimoxazol)', '400mg/80mg', 'viên'], ['Gentamicin', '80mg', 'ống'], ['Vancomycin', '1g', 'lọ'],
      ],
      'Kháng virus - kháng nấm': [
        ['Acyclovir', '400mg', 'viên'], ['Valacyclovir', '500mg', 'viên'], ['Oseltamivir', '75mg', 'viên'],
        ['Fluconazole', '150mg', 'viên'], ['Itraconazole', '100mg', 'viên'], ['Ketoconazole', '200mg', 'viên'],
        ['Clotrimazole', '1%', 'tuýp'], ['Nystatin', '500.000 IU', 'viên'],
      ],
      'Tim mạch - huyết áp - mỡ máu': [
        ['Amlodipine', '5mg', 'viên'], ['Nifedipine', '20mg', 'viên'], ['Losartan', '50mg', 'viên'], ['Valsartan', '80mg', 'viên'],
        ['Telmisartan', '40mg', 'viên'], ['Irbesartan', '150mg', 'viên'], ['Candesartan', '8mg', 'viên'], ['Perindopril', '5mg', 'viên'],
        ['Enalapril', '5mg', 'viên'], ['Lisinopril', '10mg', 'viên'], ['Captopril', '25mg', 'viên'], ['Bisoprolol', '5mg', 'viên'],
        ['Metoprolol', '50mg', 'viên'], ['Atenolol', '50mg', 'viên'], ['Carvedilol', '6.25mg', 'viên'], ['Nebivolol', '5mg', 'viên'],
        ['Hydrochlorothiazide', '25mg', 'viên'], ['Furosemide', '40mg', 'viên'], ['Spironolactone', '25mg', 'viên'],
        ['Indapamide', '1.5mg', 'viên'], ['Digoxin', '0.25mg', 'viên'], ['Amiodarone', '200mg', 'viên'], ['Nitroglycerin', '2.6mg', 'viên'],
        ['Isosorbide dinitrate', '10mg', 'viên'], ['Clopidogrel', '75mg', 'viên'], ['Atorvastatin', '20mg', 'viên'],
        ['Rosuvastatin', '10mg', 'viên'], ['Simvastatin', '20mg', 'viên'], ['Fenofibrate', '200mg', 'viên'],
      ],
      'Đái tháo đường': [
        ['Metformin', '500mg', 'viên'], ['Gliclazide', '80mg', 'viên'], ['Glimepiride', '2mg', 'viên'], ['Glibenclamide', '5mg', 'viên'],
        ['Sitagliptin', '100mg', 'viên'], ['Vildagliptin', '50mg', 'viên'], ['Linagliptin', '5mg', 'viên'], ['Empagliflozin', '10mg', 'viên'],
        ['Dapagliflozin', '10mg', 'viên'], ['Acarbose', '50mg', 'viên'], ['Pioglitazone', '15mg', 'viên'], ['Insulin (các loại)', '100 IU/ml', 'lọ'],
      ],
      'Tiêu hóa': [
        ['Omeprazole', '20mg', 'viên'], ['Esomeprazole', '40mg', 'viên'], ['Pantoprazole', '40mg', 'viên'], ['Lansoprazole', '30mg', 'viên'],
        ['Rabeprazole', '20mg', 'viên'], ['Ranitidine', '150mg', 'viên'], ['Domperidone', '10mg', 'viên'], ['Metoclopramide', '10mg', 'viên'],
        ['Sucralfate', '1g', 'gói'], ['Simethicone', '80mg', 'viên'], ['Loperamide', '2mg', 'viên'], ['Diosmectite (Smecta)', '3g', 'gói'],
        ['Bisacodyl', '5mg', 'viên'], ['Lactulose', '10g/15ml', 'gói'], ['Mebeverine', '135mg', 'viên'], ['Trimebutine', '200mg', 'viên'],
        ['Alverine', '40mg', 'viên'],
      ],
      'Hô hấp - dị ứng': [
        ['Salbutamol', '4mg', 'viên'], ['Terbutaline', '2.5mg', 'viên'], ['Budesonide (khí dung/xịt)', '0.5mg/2ml', 'lọ'],
        ['Fluticasone (xịt)', '50mcg/liều', 'lọ'], ['Ipratropium (khí dung)', '0.25mg/2ml', 'lọ'], ['Theophylline', '100mg', 'viên'],
        ['Montelukast', '10mg', 'viên'], ['Bromhexine', '8mg', 'viên'], ['Acetylcysteine', '200mg', 'gói'], ['Ambroxol', '30mg', 'viên'],
        ['Dextromethorphan', '15mg', 'viên'], ['Chlorpheniramine', '4mg', 'viên'], ['Loratadine', '10mg', 'viên'],
        ['Cetirizine', '10mg', 'viên'], ['Fexofenadine', '180mg', 'viên'], ['Desloratadine', '5mg', 'viên'],
      ],
      'Thần kinh - tâm thần - tuần hoàn não': [
        ['Gabapentin', '300mg', 'viên'], ['Pregabalin', '75mg', 'viên'], ['Amitriptyline', '25mg', 'viên'], ['Sertraline', '50mg', 'viên'],
        ['Fluoxetine', '20mg', 'viên'], ['Escitalopram', '10mg', 'viên'], ['Diazepam', '5mg', 'viên'], ['Alprazolam', '0.25mg', 'viên'],
        ['Clonazepam', '0.5mg', 'viên'], ['Rotundin', '30mg', 'viên'], ['Piracetam', '800mg', 'viên'], ['Cinnarizine', '25mg', 'viên'],
        ['Flunarizine', '5mg', 'viên'], ['Betahistine', '16mg', 'viên'], ['Vinpocetine', '5mg', 'viên'], ['Citicoline', '500mg', 'viên'],
      ],
      'Cơ xương khớp': [
        ['Glucosamine', '500mg', 'viên'], ['Chondroitin', '400mg', 'viên'], ['Eperisone', '50mg', 'viên'], ['Tolperisone', '50mg', 'viên'],
        ['Alendronate', '70mg', 'viên'], ['Calcitriol', '0.25mcg', 'viên'],
      ],
      'Vitamin - khoáng chất': [
        ['Vitamin B1', '250mg', 'viên'], ['Vitamin B6', '250mg', 'viên'], ['Vitamin B12', '1000mcg', 'viên'],
        ['Vitamin 3B (B1-B6-B12)', '', 'viên'], ['Vitamin C', '500mg', 'viên'], ['Vitamin D3', '1000 IU', 'viên'],
        ['Vitamin E', '400 IU', 'viên'], ['Calci carbonat', '500mg', 'viên'], ['Sắt (Ferrous sulfat/fumarat)', '325mg', 'viên'],
        ['Acid folic', '5mg', 'viên'], ['Kẽm (Zinc gluconate)', '70mg', 'viên'], ['Magie B6', '', 'viên'],
      ],
      'Da liễu - mắt - tai mũi họng': [
        ['Betamethasone (kem bôi)', '0.05%', 'tuýp'], ['Hydrocortisone (kem bôi)', '1%', 'tuýp'],
        ['Acid fusidic (kem bôi)', '2%', 'tuýp'], ['Chloramphenicol (nhỏ mắt)', '0.4%', 'lọ'],
        ['Tobramycin (nhỏ mắt)', '0.3%', 'lọ'], ['Natri clorid 0,9% (nước muối sinh lý)', '0.9%', 'chai'],
        ['Xylometazoline (nhỏ mũi)', '0.05%', 'chai'], ['Oxymetazoline (nhỏ mũi)', '0.05%', 'chai'],
      ],
      'Nội tiết - kháng viêm corticoid': [
        ['Levothyroxine', '50mcg', 'viên'], ['Thiamazole', '5mg', 'viên'], ['Prednisolone', '5mg', 'viên'],
        ['Methylprednisolone', '16mg', 'viên'], ['Dexamethasone', '0.5mg', 'viên'],
      ],
    };
    const out = [];
    Object.keys(groups).forEach((g) => {
      groups[g].forEach(([nm, strength, form]) => {
        const label = strength ? `${nm} ${strength}` : nm;
        out.push({ brand: label, generic: label, form, group: g });
      });
    });
    return out;
  })();

  const WARD_DATA = {"Thành phố Cần Thơ":["Phường An Bình","Phường Bình Thủy","Phường Cái Khế","Phường Cái Răng","Phường Đại Thành","Phường Hưng Phú","Phường Khánh Hòa","Phường Long Bình","Phường Long Mỹ","Phường Long Phú 1","Phường Long Tuyền","Phường Mỹ Quới","Phường Mỹ Xuyên","Phường Ngã Bảy","Phường Ngã Năm","Phường Ninh Kiều","Phường Ô Môn","Phường Phú Lợi","Phường Phước Thới","Phường Sóc Trăng","Phường Tân An","Phường Tân Lộc","Phường Thới An Đông","Phường Thới Long","Phường Thốt Nốt","Phường Thuận Hưng","Phường Trung Nhứt","Phường Vị Tân","Phường Vị Thanh","Phường Vĩnh Châu","Phường Vĩnh Phước","Xã  Vĩnh Tường","Xã An Lạc Thôn","Xã An Ninh","Xã An Thạnh","Xã Châu Thành","Xã Cờ Đỏ","Xã Cù Lao Dung","Xã Đại Hải","Xã Đại Ngãi","Xã Đông Hiệp","Xã Đông Phước","Xã Đông Thuận","Xã Gia Hòa","Xã Hiệp Hưng","Xã Hồ Đắc Kiện","Xã Hòa An","Xã Hỏa Lựu","Xã Hòa Tú","Xã Kế Sách","Xã Lai Hòa","Xã Lâm Tân","Xã Lịch Hội Thượng","Xã Liêu Tú","Xã Long Hưng","Xã Long Phú","Xã Lương Tâm","Xã Mỹ Hương","Xã Mỹ Phước","Xã Mỹ Tú","Xã Ngọc Tố","Xã Nhơn Ái","Xã Nhơn Mỹ","Xã Nhu Gia","Xã Phong Điền","Xã Phong Nẫm","Xã Phú Hữu","Xã Phú Lộc","Xã Phú Tâm","Xã Phụng Hiệp","Xã Phương Bình","Xã Tài Văn","Xã Tân Bình","Xã Tân Hòa","Xã Tân Long","Xã Tân Phước Hưng","Xã Tân Thạnh","Xã Thạnh An","Xã Thạnh Hòa","Xã Thạnh Phú","Xã Thạnh Quới","Xã Thạnh Thới An","Xã Thạnh Xuân","Xã Thới An Hội","Xã Thới Hưng","Xã Thới Lai","Xã Thuận Hòa","Xã Trần Đề","Xã Trung Hưng","Xã Trường Khánh","Xã Trường Long","Xã Trường Long Tây","Xã Trường Thành","Xã Trường Xuân","Xã Vị Thanh 1","Xã Vị Thủy","Xã Vĩnh Hải","Xã Vĩnh Lợi","Xã Vĩnh Thạnh","Xã Vĩnh Thuận Đông","Xã Vĩnh Trinh","Xã Vĩnh Viễn","Xã Xà Phiên"],"Thành phố Đà Nẵng":["Đặc khu Hoàng Sa","Phường An Hải","Phường An Khê","Phường An Thắng","Phường Bàn Thạch","Phường Cẩm Lệ","Phường Điện Bàn","Phường Điện Bàn Bắc","Phường Điện Bàn Đông","Phường Hải Châu","Phường Hải Vân","Phường Hòa Cường","Phường Hòa Khánh","Phường Hòa Xuân","Phường Hội An","Phường Hội An Đông","Phường Hội An Tây","Phường Hương Trà","Phường Liên Chiểu","Phường Ngũ Hành Sơn","Phường Quảng Phú","Phường Sơn Trà","Phường Tam Kỳ","Phường Thanh Khê","Xã Avương","Xã Bà Nà","Xã Bến Giằng","Xã Bến Hiên","Xã Chiên Đàn","Xã Đắc Pring","Xã Đại Lộc","Xã Điện Bàn Tây","Xã Đồng Dương","Xã Đông Giang","Xã Đức Phú","Xã Duy Nghĩa","Xã Duy Xuyên","Xã Gò Nổi","Xã Hà Nha","Xã Hiệp Đức","Xã Hòa Tiến","Xã Hòa Vang","Xã Hùng Sơn","Xã Khâm Đức","Xã La Dêê","Xã La Êê","Xã Lãnh Ngọc","Xã Nam Giang","Xã Nam Phước","Xã Nam Trà My","Xã Nông Sơn","Xã Núi Thành","Xã Phú Ninh","Xã Phú Thuận","Xã Phước Chánh","Xã Phước Hiệp","Xã Phước Năng","Xã Phước Thành","Xã Phước Trà","Xã Quế Phước","Xã Quế Sơn","Xã Quế Sơn Trung","Xã Sơn Cẩm Hà","Xã Sông Kôn","Xã Sông Vàng","Xã Tam Anh","Xã Tam Hải","Xã Tam Mỹ","Xã Tam Xuân","Xã Tân Hiệp","Xã Tây Giang","Xã Tây Hồ","Xã Thăng An","Xã Thăng Bình","Xã Thăng Điền","Xã Thăng Phú","Xã Thăng Trường","Xã Thạnh Bình","Xã Thạnh Mỹ","Xã Thu Bồn","Xã Thượng Đức","Xã Tiên Phước","Xã Trà Đốc","Xã Trà Giáp","Xã Trà Leng","Xã Trà Liên","Xã Trà Linh","Xã Trà My","Xã Trà Tân","Xã Trà Tập","Xã Trà Vân","Xã Việt An","Xã Vu Gia","Xã Xuân Phú"],"Thành phố Hà Nội":["Phường Ba Đình","Phường Bạch Mai","Phường Bồ Đề","Phường Cầu Giấy","Phường Chương Mỹ","Phường Cửa Nam","Phường Đại Mỗ","Phường Định Công","Phường Đống Đa","Phường Đông Ngạc","Phường Dương Nội","Phường Giảng Võ","Phường Hà Đông","Phường Hai Bà Trưng","Phường Hoàn Kiếm","Phường Hoàng Liệt","Phường Hoàng Mai","Phường Hồng Hà","Phường Khương Đình","Phường Kiến Hưng","Phường Kim Liên","Phường Láng","Phường Lĩnh Nam","Phường Long Biên","Phường Nghĩa Đô","Phường Ngọc Hà","Phường Ô Chợ Dừa","Phường Phú Diễn","Phường Phú Lương","Phường Phú Thượng","Phường Phúc Lợi","Phường Phương Liệt","Phường Sơn Tây","Phường Tây Hồ","Phường Tây Mỗ","Phường Tây Tựu","Phường Thanh Liệt","Phường Thanh Xuân","Phường Thượng Cát","Phường Từ Liêm","Phường Tùng Thiện","Phường Tương Mai","Phường Văn Miếu - Quốc Tử Giám","Phường Việt Hưng","Phường Vĩnh Hưng","Phường Vĩnh Tuy","Phường Xuân Đỉnh","Phường Xuân Phương","Phường Yên Hòa","Phường Yên Nghĩa","Phường Yên Sở","Xã An Khánh","Xã Ba Vì","Xã Bất Bạt","Xã Bát Tràng","Xã Bình Minh","Xã Chương Dương","Xã Chuyên Mỹ","Xã Cổ Đô","Xã Đa Phúc","Xã Đại Thanh","Xã Đại Xuyên","Xã Dân Hòa","Xã Đan Phượng","Xã Đoài Phương","Xã Đông Anh","Xã Dương Hòa","Xã Gia Lâm","Xã Hạ Bằng","Xã Hát Môn","Xã Hòa Lạc","Xã Hòa Phú","Xã Hòa Xá","Xã Hoài Đức","Xã Hồng Sơn","Xã Hồng Vân","Xã Hưng Đạo","Xã Hương Sơn","Xã Kiều Phú","Xã Kim Anh","Xã Liên Minh","Xã Mê Linh","Xã Minh Châu","Xã Mỹ Đức","Xã Nam Phù","Xã Ngọc Hồi","Xã Nội Bài","Xã Ô Diên","Xã Phú Cát","Xã Phù Đổng","Xã Phú Nghĩa","Xã Phú Xuyên","Xã Phúc Lộc","Xã Phúc Sơn","Xã Phúc Thịnh","Xã Phúc Thọ","Xã Phượng Dực","Xã Quảng Bị","Xã Quang Minh","Xã Quảng Oai","Xã Quốc Oai","Xã Sóc Sơn","Xã Sơn Đồng","Xã Suối Hai","Xã Tam Hưng","Xã Tây Phương","Xã Thạch Thất","Xã Thanh Oai","Xã Thanh Trì","Xã Thiên Lộc","Xã Thư Lâm","Xã Thuận An","Xã Thượng Phúc","Xã Thường Tín","Xã Tiến Thắng","Xã Trần Phú","Xã Trung Giã","Xã Ứng Hòa","Xã Ứng Thiên","Xã Vân Đình","Xã Vật Lại","Xã Vĩnh Thanh","Xã Xuân Mai","Xã Yên Bài","Xã Yên Lãng","Xã Yên Xuân"],"Thành phố Hải Phòng":["Đặc khu Bạch Long Vĩ","Đặc khu Cát Hải","Phường Ái Quốc","Phường An Biên","Phường An Dương","Phường An Hải","Phường An Phong","Phường Bắc An Phụ","Phường Bạch Đằng","Phường Chí Linh","Phường Chu Văn An","Phường Đồ Sơn","Phường Đông Hải","Phường Dương Kinh","Phường Gia Viên","Phường Hải An","Phường Hải Dương","Phường Hòa Bình","Phường Hồng An","Phường Hồng Bàng","Phường Hưng Đạo","Phường Kiến An","Phường Kinh Môn","Phường Lê Chân","Phường Lê Đại Hành","Phường Lê Ích Mộc","Phường Lê Thanh Nghị","Phường Lưu Kiếm","Phường Nam Đồ Sơn","Phường Nam Đồng","Phường Nam Triệu","Phường Ngô Quyền","Phường Nguyễn Đại Năng","Phường Nguyễn Trãi","Phường Nhị Chiểu","Phường Phạm Sư Mạnh","Phường Phù Liễn","Phường Tân Hưng","Phường Thạch Khôi","Phường Thành Đông","Phường Thiên Hương","Phường Thủy Nguyên","Phường Trần Hưng Đạo","Phường Trần Liễu","Phường Trần Nhân Tông","Phường Tứ Minh","Phường Việt Hòa","Xã An Hưng","Xã An Khánh","Xã An Lão","Xã An Phú","Xã An Quang","Xã An Thành","Xã An Trường","Xã Bắc Thanh Miện","Xã Bình Giang","Xã Cẩm Giang","Xã Cẩm Giàng","Xã Chấn Hưng","Xã Chí Minh","Xã Đại Sơn","Xã Đường An","Xã Gia Lộc","Xã Gia Phúc","Xã Hà Bắc","Xã Hà Đông","Xã Hà Nam","Xã Hà Tây","Xã Hải Hưng","Xã Hồng Châu","Xã Hợp Tiến","Xã Hùng Thắng","Xã Kẻ Sặt","Xã Khúc Thừa Dụ","Xã Kiến Hải","Xã Kiến Hưng","Xã Kiến Minh","Xã Kiến Thụy","Xã Kim Thành","Xã Lạc Phượng","Xã Lai Khê","Xã Mao Điền","Xã Nam An Phụ","Xã Nam Sách","Xã Nam Thanh Miện","Xã Nghi Dương","Xã Nguyễn Bỉnh Khiêm","Xã Nguyên Giáp","Xã Nguyễn Lương Bằng","Xã Ninh Giang","Xã Phú Thái","Xã Quyết Thắng","Xã Tân An","Xã Tân Kỳ","Xã Tân Minh","Xã Thái Tân","Xã Thanh Hà","Xã Thanh Miện","Xã Thượng Hồng","Xã Tiên Lãng","Xã Tiên Minh","Xã Trần Phú","Xã Trường Tân","Xã Tứ Kỳ","Xã Tuệ Tĩnh","Xã Việt Khê","Xã Vĩnh Am","Xã Vĩnh Bảo","Xã Vĩnh Hải","Xã Vĩnh Hòa","Xã Vĩnh Lại","Xã Vĩnh Thịnh","Xã Vĩnh Thuận","Xã Yết Kiêu"],"Thành phố Hồ Chí Minh":["Đặc khu Côn Đảo","Phường An Đông","Phường An Hội Đông","Phường An Hội Tây","Phường An Khánh","Phường An Lạc","Phường An Nhơn","Phường An Phú","Phường An Phú Đông","Phường Bà Rịa","Phường Bàn Cờ","Phường Bảy Hiền","Phường Bến Cát","Phường Bến Thành","Phường Bình Cơ","Phường Bình Đông","Phường Bình Dương","Phường Bình Hòa","Phường Bình Hưng Hòa","Phường Bình Lợi Trung","Phường Bình Phú","Phường Bình Quới","Phường Bình Tân","Phường Bình Tây","Phường Bình Thạnh","Phường Bình Thới","Phường Bình Tiên","Phường Bình Trị Đông","Phường Bình Trưng","Phường Cát Lái","Phường Cầu Kiệu","Phường Cầu Ông Lãnh","Phường Chánh Hiệp","Phường Chánh Hưng","Phường Chánh Phú Hòa","Phường Chợ Lớn","Phường Chợ Quán","Phường Dĩ An","Phường Diên Hồng","Phường Đông Hòa","Phường Đông Hưng Thuận","Phường Đức Nhuận","Phường Gia Định","Phường Gò Vấp","Phường Hạnh Thông","Phường Hiệp Bình","Phường Hòa Bình","Phường Hòa Hưng","Phường Hòa Lợi","Phường Khánh Hội","Phường Lái Thiêu","Phường Linh Xuân","Phường Long Bình","Phường Long Hương","Phường Long Nguyên","Phường Long Phước","Phường Long Trường","Phường Minh Phụng","Phường Nhiêu Lộc","Phường Phú An","Phường Phú Định","Phường Phú Lâm","Phường Phú Lợi","Phường Phú Mỹ","Phường Phú Nhuận","Phường Phú Thạnh","Phường Phú Thọ","Phường Phú Thọ Hòa","Phường Phú Thuận","Phường Phước Long","Phường Phước Thắng","Phường Rạch Dừa","Phường Sài Gòn","Phường Tam Bình","Phường Tam Long","Phường Tam Thắng","Phường Tân Bình","Phường Tân Định","Phường Tân Đông Hiệp","Phường Tân Hải","Phường Tân Hiệp","Phường Tân Hòa","Phường Tân Hưng","Phường Tân Khánh","Phường Tân Mỹ","Phường Tân Phú","Phường Tân Phước","Phường Tân Sơn","Phường Tân Sơn Hòa","Phường Tân Sơn Nhất","Phường Tân Sơn Nhì","Phường Tân Tạo","Phường Tân Thành","Phường Tân Thới Hiệp","Phường Tân Thuận","Phường Tân Uyên","Phường Tăng Nhơn Phú","Phường Tây Nam","Phường Tây Thạnh","Phường Thạnh Mỹ Tây","Phường Thới An","Phường Thới Hòa","Phường Thông Tây Hội","Phường Thủ Dầu Một","Phường Thủ Đức","Phường Thuận An","Phường Thuận Giao","Phường Trung Mỹ Tây","Phường Vĩnh Hội","Phường Vĩnh Tân","Phường Vũng Tàu","Phường Vườn Lài","Phường Xóm Chiếu","Phường Xuân Hòa","Xã An Long","Xã An Nhơn Tây","Xã An Thới Đông","Xã Bà Điểm","Xã Bắc Tân Uyên","Xã Bàu Bàng","Xã Bàu Lâm","Xã Bình Chánh","Xã Bình Châu","Xã Bình Giã","Xã Bình Hưng","Xã Bình Khánh","Xã Bình Lợi","Xã Bình Mỹ","Xã Cần Giờ","Xã Châu Đức","Xã Châu Pha","Xã Củ Chi","Xã Đất Đỏ","Xã Dầu Tiếng","Xã Đông Thạnh","Xã Hiệp Phước","Xã Hồ Tràm","Xã Hòa Hiệp","Xã Hòa Hội","Xã Hóc Môn","Xã Hưng Long","Xã Kim Long","Xã Long Điền","Xã Long Hải","Xã Long Hòa","Xã Long Sơn","Xã Minh Thạnh","Xã Ngãi Giao","Xã Nghĩa Thành","Xã Nhà Bè","Xã Nhuận Đức","Xã Phú Giáo","Xã Phú Hòa Đông","Xã Phước Hải","Xã Phước Hòa","Xã Phước Thành","Xã Tân An Hội","Xã Tân Nhựt","Xã Tân Vĩnh Lộc","Xã Thái Mỹ","Xã Thanh An","Xã Thạnh An","Xã Thường Tân","Xã Trừ Văn Thố","Xã Vĩnh Lộc","Xã Xuân Sơn","Xã Xuân Thới Sơn","Xã Xuyên Mộc"],"Thành phố Huế":["Phường An Cựu","Phường Dương Nỗ","Phường Hóa Châu","Phường Hương An","Phường Hương Thủy","Phường Hương Trà","Phường Kim Long","Phường Kim Trà","Phường Mỹ Thượng","Phường Phong Điền","Phường Phong Dinh","Phường Phong Phú","Phường Phong Quảng","Phường Phong Thái","Phường Phú Bài","Phường Phú Xuân","Phường Thanh Thủy","Phường Thuận An","Phường Thuận Hóa","Phường Thủy Xuân","Phường Vỹ Dạ","Xã A Lưới 1","Xã A Lưới 2","Xã A Lưới 3","Xã A Lưới 4","Xã A Lưới 5","Xã Bình Điền","Xã Chân Mây - Lăng Cô","Xã Đan Điền","Xã Hưng Lộc","Xã Khe Tre","Xã Lộc An","Xã Long Quảng","Xã Nam Đông","Xã Phú Hồ","Xã Phú Lộc","Xã Phú Vang","Xã Phú Vinh","Xã Quảng Điền","Xã Vinh Lộc"],"Tỉnh An Giang":["Đặc khu Kiên Hải","Đặc khu Phú Quốc","Đặc khu Thổ Châu","Phường Bình Đức","Phường Châu Đốc","Phường Chi Lăng","Phường Hà Tiên","Phường Long Phú","Phường Long Xuyên","Phường Mỹ Thới","Phường Rạch Giá","Phường Tân Châu","Phường Thới Sơn","Phường Tịnh Biên","Phường Tô Châu","Phường Vĩnh Tế","Phường Vĩnh Thông","Xã An Biên","Xã An Châu","Xã An Cư","Xã An Minh","Xã An Phú","Xã Ba Chúc","Xã Bình An","Xã Bình Giang","Xã Bình Hòa","Xã Bình Mỹ","Xã Bình Sơn","Xã Bình Thạnh Đông","Xã Cần Đăng","Xã Châu Phong","Xã Châu Phú","Xã Châu Thành","Xã Chợ Mới","Xã Chợ Vàm","Xã Cô Tô","Xã Cù Lao Giêng","Xã Định Hòa","Xã Định Mỹ","Xã Đông Hòa","Xã Đông Hưng","Xã Đông Thái","Xã Giang Thành","Xã Giồng Riềng","Xã Gò Quao","Xã Hòa Điền","Xã Hòa Hưng","Xã Hòa Lạc","Xã Hòa Thuận","Xã Hội An","Xã Hòn Đất","Xã Hòn Nghệ","Xã Khánh Bình","Xã Kiên Lương","Xã Long Điền","Xã Long Kiến","Xã Long Thạnh","Xã Mỹ Đức","Xã Mỹ Hòa Hưng","Xã Mỹ Thuận","Xã Ngọc Chúc","Xã Nhơn Hội","Xã Nhơn Mỹ","Xã Núi Cấm","Xã Ô Lâm","Xã Óc Eo","Xã Phú An","Xã Phú Hòa","Xã Phú Hữu","Xã Phú Lâm","Xã Phú Tân","Xã Sơn Hải","Xã Sơn Kiên","Xã Tân An","Xã Tân Hiệp","Xã Tân Hội","Xã Tân Thạnh","Xã Tây Phú","Xã Tây Yên","Xã Thạnh Đông","Xã Thạnh Hưng","Xã Thạnh Lộc","Xã Thạnh Mỹ Tây","Xã Thoại Sơn","Xã Tiên Hải","Xã Tri Tôn","Xã U Minh Thượng","Xã Vân Khánh","Xã Vĩnh An","Xã Vĩnh Bình","Xã Vĩnh Điều","Xã Vĩnh Gia","Xã Vĩnh Hanh","Xã Vĩnh Hậu","Xã Vĩnh Hòa","Xã Vĩnh Hòa Hưng","Xã Vĩnh Phong","Xã Vĩnh Thạnh Trung","Xã Vĩnh Thuận","Xã Vĩnh Trạch","Xã Vĩnh Tuy","Xã Vĩnh Xương"],"Tỉnh Bắc Ninh":["Phường Bắc Giang","Phường Bồng Lai","Phường Cảnh Thụy","Phường Chũ","Phường Đa Mai","Phường Đào Viên","Phường Đồng Nguyên","Phường Hạp Lĩnh","Phường Kinh Bắc","Phường Mão Điền","Phường Nam Sơn","Phường Nếnh","Phường Nhân Hòa","Phường Ninh Xá","Phường Phù Khê","Phường Phương Liễu","Phường Phượng Sơn","Phường Quế Võ","Phường Song Liễu","Phường Tam Sơn","Phường Tân An","Phường Tân Tiến","Phường Thuận Thành","Phường Tiền Phong","Phường Trạm Lộ","Phường Trí Quả","Phường Tự Lạn","Phường Từ Sơn","Phường Vân Hà","Phường Việt Yên","Phường Võ Cường","Phường Vũ Ninh","Phường Yên Dũng","Xã An Lạc","Xã Bắc Lũng","Xã Bảo Đài","Xã Biển Động","Xã Biên Sơn","Xã Bố Hạ","Xã Cẩm Lý","Xã Cao Đức","Xã Chi Lăng","Xã Đại Đồng","Xã Đại Lai","Xã Đại Sơn","Xã Đèo Gia","Xã Đông Cứu","Xã Đồng Kỳ","Xã Đông Phú","Xã Đồng Việt","Xã Dương Hưu","Xã Gia Bình","Xã Hiệp Hoà","Xã Hoàng Vân","Xã Hợp Thịnh","Xã Kép","Xã Kiên Lao","Xã Lâm Thao","Xã Lạng Giang","Xã Liên Bão","Xã Lục Nam","Xã Lục Ngạn","Xã Lục Sơn","Xã Lương Tài","Xã Mỹ Thái","Xã Nam Dương","Xã Nghĩa Phương","Xã Ngọc Thiện","Xã Nhã Nam","Xã Nhân Thắng","Xã Phật Tích","Xã Phù Lãng","Xã Phúc Hòa","Xã Quang Trung","Xã Sa Lý","Xã Sơn Động","Xã Sơn Hải","Xã Tam Đa","Xã Tam Giang","Xã Tam Tiến","Xã Tân Chi","Xã Tân Dĩnh","Xã Tân Sơn","Xã Tân Yên","Xã Tây Yên Tử","Xã Tiên Du","Xã Tiên Lục","Xã Trung Chính","Xã Trung Kênh","Xã Trường Sơn","Xã Tuấn Đạo","Xã Văn Môn","Xã Vân Sơn","Xã Xuân Cẩm","Xã Xuân Lương","Xã Yên Định","Xã Yên Phong","Xã Yên Thế","Xã Yên Trung"],"Tỉnh Cà Mau":["Phường An Xuyên","Phường Bạc Liêu","Phường Giá Rai","Phường Hiệp Thành","Phường Hòa Thành","Phường Láng Tròn","Phường Lý Văn Lâm","Phường Tân Thành","Phường Vĩnh Trạch","Xã An Trạch","Xã Biển Bạch","Xã Cái Đôi Vàm","Xã Cái Nước","Xã Châu Thới","Xã Đá Bạc","Xã Đầm Dơi","Xã Đất Mới","Xã Đất Mũi","Xã Định Thành","Xã Đông Hải","Xã Gành Hào","Xã Hồ Thị Kỷ","Xã Hòa Bình","Xã Hồng Dân","Xã Hưng Hội","Xã Hưng Mỹ","Xã Khánh An","Xã Khánh Bình","Xã Khánh Hưng","Xã Khánh Lâm","Xã Long Điền","Xã Lương Thế Trân","Xã Năm Căn","Xã Nguyễn Phích","Xã Nguyễn Việt Khái","Xã Ninh Quới","Xã Ninh Thạnh Lợi","Xã Phan Ngọc Hiển","Xã Phong Hiệp","Xã Phong Thạnh","Xã Phú Mỹ","Xã Phú Tân","Xã Phước Long","Xã Quách Phẩm","Xã Sông Đốc","Xã Tạ An Khương","Xã Tam Giang","Xã Tân Ân","Xã Tân Hưng","Xã Tân Lộc","Xã Tân Thuận","Xã Tân Tiến","Xã Thanh Tùng","Xã Thới Bình","Xã Trần Phán","Xã Trần Văn Thời","Xã Trí Phải","Xã U Minh","Xã Vĩnh Hậu","Xã Vĩnh Lộc","Xã Vĩnh Lợi","Xã Vĩnh Mỹ","Xã Vĩnh Phước","Xã Vĩnh Thanh"],"Tỉnh Cao Bằng":["Phường Nùng Trí Cao","Phường Tân Giang","Phường Thục Phán","Xã Bạch Đằng","Xã Bảo Lạc","Xã Bảo Lâm","Xã Bế Văn Đàn","Xã Ca Thành","Xã Cần Yên","Xã Canh Tân","Xã Cô Ba","Xã Cốc Pàng","Xã Đàm Thủy","Xã Đình Phong","Xã Đoài Dương","Xã Độc Lập","Xã Đông Khê","Xã Đức Long","Xã Hạ Lang","Xã Hà Quảng","Xã Hạnh Phúc","Xã Hòa An","Xã Hưng Đạo","Xã Huy Giáp","Xã Khánh Xuân","Xã Kim Đồng","Xã Lũng Nặm","Xã Lý Bôn","Xã Lý Quốc","Xã Minh Khai","Xã Minh Tâm","Xã Nam Quang","Xã Nam Tuấn","Xã Nguyên Bình","Xã Nguyễn Huệ","Xã Phan Thanh","Xã Phục Hòa","Xã Quang Hán","Xã Quảng Lâm","Xã Quang Long","Xã Quang Trung","Xã Quảng Uyên","Xã Sơn Lộ","Xã Tam Kim","Xã Thạch An","Xã Thành Công","Xã Thanh Long","Xã Thông Nông","Xã Tĩnh Túc","Xã Tổng Cọt","Xã Trà Lĩnh","Xã Trùng Khánh","Xã Trường Hà","Xã Vinh Quý","Xã Xuân Trường","Xã Yên Thổ"],"Tỉnh Đắk Lắk":["Phường Bình Kiến","Phường Buôn Hồ","Phường Buôn Ma Thuột","Phường Cư Bao","Phường Đông Hòa","Phường Ea Kao","Phường Hòa Hiệp","Phường Phú Yên","Phường Sông Cầu","Phường Tân An","Phường Tân Lập","Phường Thành Nhất","Phường Tuy Hòa","Phường Xuân Đài","Xã Buôn Đôn","Xã Cư M’gar","Xã Cư M’ta","Xã Cư Pơng","Xã Cư Prao","Xã Cư Pui","Xã Cư Yang","Xã Cuôr Đăng","Xã Đắk Liêng","Xã Đắk Phơi","Xã Dang Kang","Xã Dliê Ya","Xã Đồng Xuân","Xã Dray Bhăng","Xã Đức Bình","Xã Dur Kmăl","Xã Ea Bá","Xã Ea Bung","Xã Ea Drăng","Xã Ea Drông","Xã Ea Hiao","Xã Ea H’Leo","Xã Ea Kar","Xã Ea Khăl","Xã Ea Kiết","Xã Ea Kly","Xã Ea Knốp","Xã Ea Knuếc","Xã Ea Ktur","Xã Ea Ly","Xã Ea M’Droh","Xã Ea Na","Xã Ea Ning","Xã Ea Nuôl","Xã Ea Ô","Xã Ea Păl","Xã Ea Phê","Xã Ea Riêng","Xã Ea Rốk","Xã Ea Súp","Xã Ea Trang","Xã Ea Tul","Xã Ea Wer","Xã Ea Wy","Xã Hòa Mỹ","Xã Hòa Phú","Xã Hòa Sơn","Xã Hòa Thịnh","Xã Hòa Xuân","Xã Ia Lốp","Xã Ia Rvê","Xã Krông Á","Xã Krông Ana","Xã Krông Bông","Xã Krông Búk","Xã Krông Năng","Xã Krông Nô","Xã Krông Pắc","Xã Liên Sơn Lắk","Xã M’Drắk","Xã Nam Ka","Xã Ô Loan","Xã Phú Hòa 1","Xã Phú Hòa 2","Xã Phú Mỡ","Xã Phú Xuân","Xã Pơng Drang","Xã Quảng Phú","Xã Sơn Hòa","Xã Sơn Thành","Xã Sông Hinh","Xã Suối Trai","Xã Tam Giang","Xã Tân Tiến","Xã Tây Hòa","Xã Tây Sơn","Xã Tuy An Bắc","Xã Tuy An Đông","Xã Tuy An Nam","Xã Tuy An Tây","Xã Vân Hòa","Xã Vụ Bổn","Xã Xuân Cảnh","Xã Xuân Lãnh","Xã Xuân Lộc","Xã Xuân Phước","Xã Xuân Thọ","Xã Yang Mao"],"Tỉnh Điện Biên":["Phường Điện Biên Phủ","Phường Mường Lay","Phường Mường Thanh","Xã Búng Lao","Xã Chà Tở","Xã Chiềng Sinh","Xã Mường Ảng","Xã Mường Chà","Xã Mường Lạn","Xã Mường Luân","Xã Mường Mùn","Xã Mường Nhà","Xã Mường Nhé","Xã Mường Phăng","Xã Mường Pồn","Xã Mường Toong","Xã Mường Tùng","Xã Nà Bủng","Xã Nà Hỳ","Xã Na Sang","Xã Na Son","Xã Nà Tấu","Xã Nậm Kè","Xã Nậm Nèn","Xã Núa Ngam","Xã Pa Ham","Xã Phình Giàng","Xã Pu Nhi","Xã Pú Nhung","Xã Quài Tở","Xã Quảng Lâm","Xã Sam Mứn","Xã Sáng Nhè","Xã Si Pa Phìn","Xã Sín Chải","Xã Sín Thầu","Xã Sính Phình","Xã Thanh An","Xã Thanh Nưa","Xã Thanh Yên","Xã Tìa Dình","Xã Tủa Chùa","Xã Tủa Thàng","Xã Tuần Giáo","Xã Xa Dung"],"Tỉnh Đồng Nai":["Phường An Lộc","Phường Bảo Vinh","Phường Biên Hòa","Phường Bình Lộc","Phường Bình Long","Phường Bình Phước","Phường Chơn Thành","Phường Đồng Xoài","Phường Hàng Gòn","Phường Hố Nai","Phường Long Bình","Phường Long Hưng","Phường Long Khánh","Phường Minh Hưng","Phường Phước Bình","Phường Phước Long","Phường Phước Tân","Phường Tam Hiệp","Phường Tam Phước","Phường Tân Triều","Phường Trấn Biên","Phường Trảng Dài","Phường Xuân Lập","Xã An Phước","Xã An Viễn","Xã Bàu Hàm","Xã Bình An","Xã Bình Minh","Xã Bình Tân","Xã Bom Bo","Xã Bù Đăng","Xã Bù Gia Mập","Xã Cẩm Mỹ","Xã Đa Kia","Xã Đại Phước","Xã Đak Lua","Xã Đak Nhau","Xã Đăk Ơ","Xã Dầu Giây","Xã Định Quán","Xã Đồng Phú","Xã Đồng Tâm","Xã Gia Kiệm","Xã Hưng Phước","Xã Hưng Thịnh","Xã La Ngà","Xã Lộc Hưng","Xã Lộc Ninh","Xã Lộc Quang","Xã Lộc Tấn","Xã Lộc Thạnh","Xã Lộc Thành","Xã Long Hà","Xã Long Phước","Xã Long Thành","Xã Minh Đức","Xã Nam Cát Tiên","Xã Nghĩa Trung","Xã Nha Bích","Xã Nhơn Trạch","Xã Phú Hòa","Xã Phú Lâm","Xã Phú Lý","Xã Phú Nghĩa","Xã Phú Riềng","Xã Phú Trung","Xã Phú Vinh","Xã Phước An","Xã Phước Sơn","Xã Phước Thái","Xã Sông Ray","Xã Tà Lài","Xã Tân An","Xã Tân Hưng","Xã Tân Khai","Xã Tân Lợi","Xã Tân Phú","Xã Tân Quan","Xã Tân Tiến","Xã Thanh Sơn","Xã Thiện Hưng","Xã Thọ Sơn","Xã Thống Nhất","Xã Thuận Lợi","Xã Trảng Bom","Xã Trị An","Xã Xuân Bắc","Xã Xuân Định","Xã Xuân Đông","Xã Xuân Đường","Xã Xuân Hòa","Xã Xuân Lộc","Xã Xuân Phú","Xã Xuân Quế","Xã Xuân Thành"],"Tỉnh Đồng Tháp":["Phường An Bình","Phường Bình Xuân","Phường Cai Lậy","Phường Cao Lãnh","Phường Đạo Thạnh","Phường Gò Công","Phường Hồng Ngự","Phường Long Thuận","Phường Mỹ Ngãi","Phường Mỹ Phong","Phường Mỹ Phước Tây","Phường Mỹ Tho","Phường Mỹ Trà","Phường Nhị Quý","Phường Sa Đéc","Phường Sơn Qui","Phường Thanh Hòa","Phường Thới Sơn","Phường Thường Lạc","Phường Trung An","Xã An Hòa","Xã An Hữu","Xã An Long","Xã An Phước","Xã An Thạnh Thủy","Xã Ba Sao","Xã Bình Hàng Trung","Xã Bình Ninh","Xã Bình Phú","Xã Bình Thành","Xã Bình Trưng","Xã Cái Bè","Xã Châu Thành","Xã Chợ Gạo","Xã Đốc Binh Kiều","Xã Đồng Sơn","Xã Gia Thuận","Xã Gò Công Đông","Xã Hậu Mỹ","Xã Hiệp Đức","Xã Hòa Long","Xã Hội Cư","Xã Hưng Thạnh","Xã Kim Sơn","Xã Lai Vung","Xã Lấp Vò","Xã Long Bình","Xã Long Định","Xã Long Hưng","Xã Long Khánh","Xã Long Phú Thuận","Xã Long Tiên","Xã Lương Hòa Lạc","Xã Mỹ An Hưng","Xã Mỹ Đức Tây","Xã Mỹ Hiệp","Xã Mỹ Lợi","Xã Mỹ Quí","Xã Mỹ Thành","Xã Mỹ Thiện","Xã Mỹ Thọ","Xã Mỹ Tịnh An","Xã Ngũ Hiệp","Xã Phong Hòa","Xã Phong Mỹ","Xã Phú Cường","Xã Phú Hựu","Xã Phú Thành","Xã Phú Thọ","Xã Phương Thịnh","Xã Tam Nông","Xã Tân Điền","Xã Tân Đông","Xã Tân Dương","Xã Tân Hộ Cơ","Xã Tân Hòa","Xã Tân Hồng","Xã Tân Hương","Xã Tân Khánh Trung","Xã Tân Long","Xã Tân Nhuận Đông","Xã Tân Phú","Xã Tân Phú Đông","Xã Tân Phú Trung","Xã Tân Phước 1","Xã Tân Phước 2","Xã Tân Phước 3","Xã Tân Thành","Xã Tân Thạnh","Xã Tân Thới","Xã Tân Thuận Bình","Xã Thanh Bình","Xã Thanh Hưng","Xã Thanh Mỹ","Xã Thạnh Phú","Xã Tháp Mười","Xã Thường Phước","Xã Tràm Chim","Xã Trường Xuân","Xã Vĩnh Bình","Xã Vĩnh Hựu","Xã Vĩnh Kim"],"Tỉnh Gia Lai":["Phường An Bình","Phường An Khê","Phường An Nhơn","Phường An Nhơn Bắc","Phường An Nhơn Đông","Phường An Nhơn Nam","Phường An Phú","Phường Ayun Pa","Phường Bình Định","Phường Bồng Sơn","Phường Diên Hồng","Phường Hoài Nhơn","Phường Hoài Nhơn Bắc","Phường Hoài Nhơn Đông","Phường Hoài Nhơn Nam","Phường Hoài Nhơn Tây","Phường Hội Phú","Phường Pleiku","Phường Quy Nhơn","Phường Quy Nhơn Bắc","Phường Quy Nhơn Đông","Phường Quy Nhơn Nam","Phường Quy Nhơn Tây","Phường Tam Quan","Phường Thống Nhất","Xã Al Bá","Xã Ân Hảo","Xã An Hòa","Xã An Lão","Xã An Lương","Xã An Nhơn Tây","Xã An Toàn","Xã Ân Tường","Xã An Vinh","Xã Ayun","Xã Bàu Cạn","Xã Biển Hồ","Xã Bình An","Xã Bình Dương","Xã Bình Hiệp","Xã Bình Khê","Xã Bình Phú","Xã Bờ Ngoong","Xã Canh Liên","Xã Canh Vinh","Xã Cát Tiến","Xã Chơ Long","Xã Chư A Thai","Xã Chư Krey","Xã Chư Păh","Xã Chư Prông","Xã Chư Pưh","Xã Chư Sê","Xã Cửu An","Xã Đak Đoa","Xã Đak Pơ","Xã Đak Rong","Xã Đak Sơmei","Xã Đăk Song","Xã Đề Gi","Xã Đức Cơ","Xã Gào","Xã Hòa Hội","Xã Hoài Ân","Xã Hội Sơn","Xã Hra","Xã Ia Băng","Xã Ia Boòng","Xã Ia Chia","Xã Ia Dơk","Xã Ia Dom","Xã Ia Dreh","Xã Ia Grai","Xã Ia Hiao","Xã Ia Hrú","Xã Ia Hrung","Xã Ia Khươl","Xã Ia Ko","Xã Ia Krái","Xã Ia Krêl","Xã Ia Lâu","Xã Ia Le","Xã Ia Ly","Xã Ia Mơ","Xã Ia Nan","Xã Ia O","Xã Ia Pa","Xã Ia Phí","Xã Ia Pia","Xã Ia Pnôn","Xã Ia Púch","Xã Ia Rbol","Xã Ia Rsai","Xã Ia Sao","Xã Ia Tôr","Xã Ia Tul","Xã Kbang","Xã KDang","Xã Kim Sơn","Xã Kon Chiêng","Xã Kon Gang","Xã Kông Bơ La","Xã Kông Chro","Xã Krong","Xã Lơ Pang","Xã Mang Yang","Xã Ngô Mây","Xã Nhơn Châu","Xã Phù Cát","Xã Phù Mỹ","Xã Phù Mỹ Bắc","Xã Phù Mỹ Đông","Xã Phù Mỹ Nam","Xã Phù Mỹ Tây","Xã Phú Thiện","Xã Phú Túc","Xã Pờ Tó","Xã Sơn Lang","Xã SRó","Xã Tây Sơn","Xã Tơ Tung","Xã Tuy Phước","Xã Tuy Phước Bắc","Xã Tuy Phước Đông","Xã Tuy Phước Tây","Xã Uar","Xã Vân Canh","Xã Vạn Đức","Xã Vĩnh Quang","Xã Vĩnh Sơn","Xã Vĩnh Thạnh","Xã Vĩnh Thịnh","Xã Xuân An","Xã Ya Hội","Xã Ya Ma"],"Tỉnh Hà Tĩnh":["Phường Bắc Hồng Lĩnh","Phường Hà Huy Tập","Phường Hải Ninh","Phường Hoành Sơn","Phường Nam Hồng Lĩnh","Phường Sông Trí","Phường Thành Sen","Phường Trần Phú","Phường Vũng Áng","Xã Cẩm Bình","Xã Cẩm Duệ","Xã Cẩm Hưng","Xã Cẩm Lạc","Xã Cẩm Trung","Xã Cẩm Xuyên","Xã Can Lộc","Xã Cổ Đạm","Xã Đan Hải","Xã Đông Kinh","Xã Đồng Lộc","Xã Đồng Tiến","Xã Đức Đồng","Xã Đức Minh","Xã Đức Quang","Xã Đức Thịnh","Xã Đức Thọ","Xã Gia Hanh","Xã Hà Linh","Xã Hồng Lộc","Xã Hương Bình","Xã Hương Đô","Xã Hương Khê","Xã Hương Phố","Xã Hương Sơn","Xã Hương Xuân","Xã Kim Hoa","Xã Kỳ Anh","Xã Kỳ Hoa","Xã Kỳ Khang","Xã Kỳ Lạc","Xã Kỳ Thượng","Xã Kỳ Văn","Xã Kỳ Xuân","Xã Lộc Hà","Xã Mai Hoa","Xã Mai Phụ","Xã Nghi Xuân","Xã Phúc Trạch","Xã Sơn Giang","Xã Sơn Hồng","Xã Sơn Kim 1","Xã Sơn Kim 2","Xã Sơn Tây","Xã Sơn Tiến","Xã Thạch Hà","Xã Thạch Khê","Xã Thạch Lạc","Xã Thạch Xuân","Xã Thiên Cầm","Xã Thượng Đức","Xã Tiên Điền","Xã Toàn Lưu","Xã Trường Lưu","Xã Tứ Mỹ","Xã Tùng Lộc","Xã Việt Xuyên","Xã Vũ Quang","Xã Xuân Lộc","Xã Yên Hòa"],"Tỉnh Hưng Yên":["Phường Đường Hào","Phường Hồng Châu","Phường Mỹ Hào","Phường Phố Hiến","Phường Sơn Nam","Phường Thái Bình","Phường Thượng Hồng","Phường Trà Lý","Phường Trần Hưng Đạo","Phường Trần Lãm","Phường Vũ Phúc","Xã A Sào","Xã Ái Quốc","Xã Ân Thi","Xã Bắc Đông Hưng","Xã Bắc Đông Quan","Xã Bắc Thái Ninh","Xã Bắc Thụy Anh","Xã Bắc Tiên Hưng","Xã Bình Định","Xã Bình Nguyên","Xã Bình Thanh","Xã Châu Ninh","Xã Chí Minh","Xã Đại Đồng","Xã Diên Hà","Xã Đoàn Đào","Xã Đồng Bằng","Xã Đồng Châu","Xã Đông Hưng","Xã Đông Quan","Xã Đông Thái Ninh","Xã Đông Thụy Anh","Xã Đông Tiền Hải","Xã Đông Tiên Hưng","Xã Đức Hợp","Xã Hiệp Cường","Xã Hoàn Long","Xã Hoàng Hoa Thám","Xã Hồng Minh","Xã Hồng Quang","Xã Hồng Vũ","Xã Hưng Hà","Xã Hưng Phú","Xã Khoái Châu","Xã Kiến Xương","Xã Lạc Đạo","Xã Lê Lợi","Xã Lê Quý Đôn","Xã Long Hưng","Xã Lương Bằng","Xã Mễ Sở","Xã Minh Thọ","Xã Nam Cường","Xã Nam Đông Hưng","Xã Nam Thái Ninh","Xã Nam Thụy Anh","Xã Nam Tiền Hải","Xã Nam Tiên Hưng","Xã Nghĩa Dân","Xã Nghĩa Trụ","Xã Ngọc Lâm","Xã Ngự Thiên","Xã Nguyễn Du","Xã Nguyễn Trãi","Xã Nguyễn Văn Linh","Xã Như Quỳnh","Xã Phạm Ngũ Lão","Xã Phụ Dực","Xã Phụng Công","Xã Quang Hưng","Xã Quang Lịch","Xã Quỳnh An","Xã Quỳnh Phụ","Xã Tân Hưng","Xã Tân Thuận","Xã Tân Tiến","Xã Tây Thái Ninh","Xã Tây Thụy Anh","Xã Tây Tiền Hải","Xã Thái Ninh","Xã Thái Thụy","Xã Thần Khê","Xã Thư Trì","Xã Thư Vũ","Xã Thụy Anh","Xã Tiền Hải","Xã Tiên Hoa","Xã Tiên Hưng","Xã Tiên La","Xã Tiên Lữ","Xã Tiên Tiến","Xã Tống Trân","Xã Trà Giang","Xã Triệu Việt Vương","Xã Văn Giang","Xã Vạn Xuân","Xã Việt Tiến","Xã Việt Yên","Xã Vũ Quý","Xã Vũ Thư","Xã Vũ Tiên","Xã Xuân Trúc","Xã Yên Mỹ"],"Tỉnh Khánh Hòa":["Đặc khu Trường Sa","Phường Ba Ngòi","Phường Bắc Cam Ranh","Phường Bắc Nha Trang","Phường Bảo An","Phường Cam Linh","Phường Cam Ranh","Phường Đô Vinh","Phường Đông Hải","Phường Đông Ninh Hòa","Phường Hòa Thắng","Phường Nam Nha Trang","Phường Nha Trang","Phường Ninh Chử","Phường Ninh Hòa","Phường Phan Rang","Phường Tây Nha Trang","Xã Anh Dũng","Xã Bác Ái","Xã Bác Ái Đông","Xã Bác Ái Tây","Xã Bắc Khánh Vĩnh","Xã Bắc Ninh Hòa","Xã Cà Ná","Xã Cam An","Xã Cam Hiệp","Xã Cam Lâm","Xã Công Hải","Xã Đại Lãnh","Xã Diên Điền","Xã Diên Khánh","Xã Diên Lạc","Xã Diên Lâm","Xã Diên Thọ","Xã Đông Khánh Sơn","Xã Hòa Trí","Xã Khánh Sơn","Xã Khánh Vĩnh","Xã Lâm Sơn","Xã Mỹ Sơn","Xã Nam Cam Ranh","Xã Nam Khánh Vĩnh","Xã Nam Ninh Hòa","Xã Ninh Hải","Xã Ninh Phước","Xã Ninh Sơn","Xã Phước Dinh","Xã Phước Hà","Xã Phước Hậu","Xã Phước Hữu","Xã Suối Dầu","Xã Suối Hiệp","Xã Tân Định","Xã Tây Khánh Sơn","Xã Tây Khánh Vĩnh","Xã Tây Ninh Hòa","Xã Thuận Bắc","Xã Thuận Nam","Xã Trung Khánh Vĩnh","Xã Tu Bông","Xã Vạn Hưng","Xã Vạn Ninh","Xã Vạn Thắng","Xã Vĩnh Hải","Xã Xuân Hải"],"Tỉnh Lai Châu":["Phường Đoàn Kết","Phường Tân Phong","Xã Bản Bo","Xã Bình Lư","Xã Bum Nưa","Xã Bum Tở","Xã Dào San","Xã Hồng Thu","Xã Hua Bum","Xã Khoen On","Xã Khổng Lào","Xã Khun Há","Xã Lê Lợi","Xã Mù Cả","Xã Mường Khoa","Xã Mường Kim","Xã Mường Mô","Xã Mường Tè","Xã Mường Than","Xã Nậm Cuổi","Xã Nậm Hàng","Xã Nậm Mạ","Xã Nậm Sỏ","Xã Nậm Tăm","Xã Pa Tần","Xã Pa Ủ","Xã Pắc Ta","Xã Phong Thổ","Xã Pu Sam Cáp","Xã Sì Lở Lầu","Xã Sìn Hồ","Xã Sin Suối Hồ","Xã Tả Lèng","Xã Tà Tổng","Xã Tân Uyên","Xã Than Uyên","Xã Thu Lũm","Xã Tủa Sín Chải"],"Tỉnh Lâm Đồng":["Đặc khu Phú Quý","Phường 1 Bảo Lộc","Phường 2 Bảo Lộc","Phường 3 Bảo Lộc","Phường Bắc Gia Nghĩa","Phường Bình Thuận","Phường B’Lao","Phường Cam Ly - Đà Lạt","Phường Đông Gia Nghĩa","Phường Hàm Thắng","Phường La Gi","Phường Lâm Viên - Đà Lạt","Phường Lang Biang - Đà Lạt","Phường Mũi Né","Phường Nam Gia Nghĩa","Phường Phan Thiết","Phường Phú Thuỷ","Phường Phước Hội","Phường Tiến Thành","Phường Xuân Hương - Đà Lạt","Phường Xuân Trường - Đà Lạt","Xã Bắc Bình","Xã Bắc Ruộng","Xã Bảo Lâm 1","Xã Bảo Lâm 2","Xã Bảo Lâm 3","Xã Bảo Lâm 4","Xã Bảo Lâm 5","Xã Bảo Thuận","Xã Cát Tiên","Xã Cát Tiên 2","Xã Cát Tiên 3","Xã Cư Jút","Xã Đạ Huoai","Xã Đạ Huoai 2","Xã Đạ Huoai 3","Xã Đạ Tẻh","Xã Đạ Tẻh 2","Xã Đạ Tẻh 3","Xã Đắk Mil","Xã Đắk Sắk","Xã Đắk Song","Xã Đắk Wil","Xã Đam Rông 1","Xã Đam Rông 2","Xã Đam Rông 3","Xã Đam Rông 4","Xã Di Linh","Xã Đinh Trang Thượng","Xã Đinh Văn Lâm Hà","Xã Đơn Dương","Xã Đông Giang","Xã Đồng Kho","Xã Đức An","Xã Đức Lập","Xã Đức Linh","Xã Đức Trọng","Xã D’Ran","Xã Gia Hiệp","Xã Hải Ninh","Xã Hàm Kiệm","Xã Hàm Liêm","Xã Hàm Tân","Xã Hàm Thạnh","Xã Hàm Thuận","Xã Hàm Thuận Bắc","Xã Hàm Thuận Nam","Xã Hiệp Thạnh","Xã Hòa Bắc","Xã Hòa Ninh","Xã Hòa Thắng","Xã Hoài Đức","Xã Hồng Sơn","Xã Hồng Thái","Xã Ka Đô","Xã Kiến Đức","Xã Krông Nô","Xã La Dạ","Xã Lạc Dương","Xã Liên Hương","Xã Lương Sơn","Xã Nam Ban Lâm Hà","Xã Nam Đà","Xã Nam Dong","Xã Nam Hà Lâm Hà","Xã Nâm Nung","Xã Nam Thành","Xã Nghị Đức","Xã Nhân Cơ","Xã Ninh Gia","Xã Phan Rí Cửa","Xã Phan Sơn","Xã Phú Sơn Lâm Hà","Xã Phúc Thọ Lâm Hà","Xã Quảng Hòa","Xã Quảng Khê","Xã Quảng Lập","Xã Quảng Phú","Xã Quảng Sơn","Xã Quảng Tân","Xã Quảng Tín","Xã Quảng Trực","Xã Sơn Điền","Xã Sơn Mỹ","Xã Sông Lũy","Xã Suối Kiết","Xã Tà Đùng","Xã Tà Hine","Xã Tà Năng","Xã Tân Hà Lâm Hà","Xã Tân Hải","Xã Tân Hội","Xã Tân Lập","Xã Tân Minh","Xã Tân Thành","Xã Tánh Linh","Xã Thuận An","Xã Thuận Hạnh","Xã Trà Tân","Xã Trường Xuân","Xã Tuy Đức","Xã Tuy Phong","Xã Tuyên Quang","Xã Vĩnh Hảo"],"Tỉnh Lạng Sơn":["Phường Đông Kinh","Phường Kỳ Lừa","Phường Lương Văn Tri","Phường Tam Thanh","Xã Ba Sơn","xã Bắc Sơn","Xã Bằng Mạc","Xã Bình Gia","Xã Cai Kinh","Xã Cao Lộc","Xã Châu Sơn","Xã Chi Lăng","Xã Chiến Thắng","Xã Công Sơn","Xã Điềm He","Xã Đình Lập","Xã Đoàn Kết","Xã Đồng Đăng","Xã Hoa Thám","Xã Hoàng Văn Thụ","Xã Hội Hoan","Xã Hồng Phong","Xã Hưng Vũ","Xã Hữu Liên","Xã Hữu Lũng","Xã Kháng Chiến","Xã Khánh Khê","Xã Khuất Xá","Xã Kiên Mộc","Xã Lộc Bình","Xã Lợi Bác","Xã Mẫu Sơn","Xã Na Dương","Xã Na Sầm","Xã Nhân Lý","Xã Nhất Hòa","Xã Quan Sơn","Xã Quốc Khánh","Xã Quốc Việt","Xã Quý Hòa","Xã Tân Đoàn","Xã Tân Thành","Xã Tân Tiến","Xã Tân Tri","Xã Tân Văn","Xã Thái Bình","Xã Thất Khê","Xã Thiện Hòa","Xã Thiện Long","Xã Thiện Tân","Xã Thiện Thuật","Xã Thống Nhất","Xã Thụy Hùng","Xã Tràng Định","Xã Tri Lễ","Xã Tuấn Sơn","Xã Văn Lãng","Xã Vạn Linh","Xã Vân Nham","Xã Văn Quan","Xã Vũ Lăng","Xã Vũ Lễ","Xã Xuân Dương","Xã Yên Bình","Xã Yên Phúc"],"Tỉnh Lào Cai":["Phường Âu Lâu","Phường Cam Đường","Phường Cầu Thia","Phường Lào Cai","Phường Nam Cường","Phường Nghĩa Lộ","Phường Sa Pa","Phường Trung Tâm","Phường Văn Phú","Phường Yên Bái","Xã A Mú Sung","Xã Bắc Hà","Xã Bản Hồ","Xã Bản Lầu","Xã Bản Liền","Xã Bản Xèo","Xã Bảo Ái","Xã Bảo Hà","Xã Bảo Nhai","Xã Bảo Thắng","Xã Bảo Yên","Xã Bát Xát","Xã Cảm Nhân","Xã Cao Sơn","Xã Cát Thịnh","Xã Chấn Thịnh","Xã Châu Quế","Xã Chế Tạo","Xã Chiềng Ken","Xã Cốc Lầu","Xã Cốc San","Xã Dền Sáng","Xã Đông Cuông","Xã Dương Quỳ","Xã Gia Hội","Xã Gia Phú","Xã Hạnh Phúc","Xã Hợp Thành","Xã Hưng Khánh","Xã Khánh Hòa","Xã Khánh Yên","Xã Khao Mang","Xã Lâm Giang","Xã Lâm Thượng","Xã Lao Chải","Xã Liên Sơn","Xã Lục Yên","Xã Lùng Phình","Xã Lương Thịnh","Xã Mậu A","Xã Minh Lương","Xã Mỏ Vàng","Xã Mù Cang Chải","Xã Mường Bo","Xã Mường Hum","Xã Mường Khương","Xã Mường Lai","Xã Nậm Chày","Xã Nậm Có","Xã Nậm Xé","Xã Nghĩa Đô","Xã Nghĩa Tâm","Xã Ngũ Chỉ Sơn","Xã Pha Long","Xã Phình Hồ","Xã Phong Dụ Hạ","Xã Phong Dụ Thượng","Xã Phong Hải","Xã Phúc Khánh","Xã Phúc Lợi","Xã Púng Luông","Xã Quy Mông","Xã Si Ma Cai","Xã Sín Chéng","Xã Sơn Lương","Xã Tả Củ Tỷ","Xã Tả Phìn","Xã Tả Van","Xã Tà Xi Láng","Xã Tân Hợp","Xã Tân Lĩnh","Xã Tằng Loỏng","Xã Thác Bà","Xã Thượng Bằng La","Xã Thượng Hà","Xã Trạm Tấu","Xã Trấn Yên","Xã Trịnh Tường","Xã Tú Lệ","Xã Văn Bàn","Xã Văn Chấn","Xã Việt Hồng","Xã Võ Lao","Xã Xuân Ái","Xã Xuân Hòa","Xã Xuân Quang","Xã Y Tý","Xã Yên Bình","Xã Yên Thành"],"Tỉnh Nghệ An":["Phường Cửa Lò","Phường Hoàng Mai","Phường Quỳnh Mai","Phường Tân Mai","Phường Tây Hiếu","Phường Thái Hòa","Phường Thành Vinh","Phường Trường Vinh","Phường Vinh Hưng","Phường Vinh Lộc","Phường Vinh Phú","Xã An Châu","Xã Anh Sơn","Xã Anh Sơn Đông","Xã Bắc Lý","Xã Bạch Hà","Xã Bạch Ngọc","Xã Bích Hào","Xã Bình Chuẩn","Xã Bình Minh","Xã Cam Phục","Xã Cát Ngạn","Xã Châu Bình","Xã Châu Hồng","Xã Châu Khê","Xã Châu Lộc","Xã Châu Tiến","Xã Chiêu Lưu","Xã Con Cuông","Xã Đại Đồng","Xã Đại Huệ","Xã Diễn Châu","Xã Đô Lương","Xã Đông Hiếu","Xã Đông Lộc","Xã Đông Thành","Xã Đức Châu","Xã Giai Lạc","Xã Giai Xuân","Xã Hải Châu","Xã Hải Lộc","Xã Hạnh Lâm","Xã Hoa Quân","Xã Hợp Minh","Xã Hùng Chân","Xã Hùng Châu","Xã Hưng Nguyên","Xã Hưng Nguyên Nam","Xã Huồi Tụ","Xã Hữu Khuông","Xã Hữu Kiệm","Xã Keng Đu","Xã Kim Bảng","Xã Kim Liên","Xã Lam Thành","Xã Lượng Minh","Xã Lương Sơn","Xã Mậu Thạch","Xã Minh Châu","Xã Minh Hợp","Xã Môn Sơn","Xã Mường Chọng","Xã Mường Ham","Xã Mường Lống","Xã Mường Quàng","Xã Mường Típ","Xã Mường Xén","Xã Mỹ Lý","Xã Na Loi","Xã Na Ngoi","Xã Nậm Cắn","Xã Nam Đàn","Xã Nga My","Xã Nghi Lộc","Xã Nghĩa Đàn","Xã Nghĩa Đồng","Xã Nghĩa Hành","Xã Nghĩa Hưng","Xã Nghĩa Khánh","Xã Nghĩa Lâm","Xã Nghĩa Lộc","Xã Nghĩa Mai","Xã Nghĩa Thọ","Xã Nhân Hòa","Xã Nhôn Mai","Xã Phúc Lộc","Xã Quan Thành","Xã Quảng Châu","Xã Quang Đồng","Xã Quế Phong","Xã Quỳ Châu","Xã Quỳ Hợp","Xã Quỳnh Anh","Xã Quỳnh Lưu","Xã Quỳnh Phú","Xã Quỳnh Sơn","Xã Quỳnh Tam","Xã Quỳnh Thắng","Xã Quỳnh Văn","Xã Sơn Lâm","Xã Tam Đồng","Xã Tam Hợp","Xã Tam Quang","Xã Tam Thái","Xã Tân An","Xã Tân Châu","Xã Tân Kỳ","Xã Tân Phú","Xã Thần Lĩnh","Xã Thành Bình Thọ","Xã Thiên Nhẫn","Xã Thông Thụ","Xã Thuần Trung","Xã Tiên Đồng","Xã Tiền Phong","Xã Tri Lễ","Xã Trung Lộc","Xã Tương Dương","Xã Vạn An","Xã Vân Du","Xã Văn Hiến","Xã Văn Kiều","Xã Vân Tụ","Xã Vĩnh Tường","Xã Xuân Lâm","Xã Yên Hòa","Xã Yên Na","Xã Yên Thành","Xã Yên Trung","Xã Yên Xuân"],"Tỉnh Ninh Bình":["Phường Châu Sơn","Phường Đông A","Phường Đông Hoa Lư","Phường Đồng Văn","Phường Duy Hà","Phường Duy Tân","Phường Duy Tiên","Phường Hà Nam","Phường Hoa Lư","Phường Hồng Quang","Phường Kim Bảng","Phường Kim Thanh","Phường Lê Hồ","Phường Liêm Tuyền","Phường Lý Thường Kiệt","Phường Mỹ Lộc","Phường Nam Định","Phường Nam Hoa Lư","Phường Nguyễn Uý","Phường Phủ Lý","Phường Phù Vân","Phường Tam Chúc","Phường Tam Điệp","Phường Tây Hoa Lư","Phường Thành Nam","Phường Thiên Trường","Phường Tiên Sơn","Phường Trung Sơn","Phường Trường Thi","Phường Vị Khê","Phường Yên Sơn","Phường Yên Thắng","Xã Bắc Lý","Xã Bình An","Xã Bình Giang","Xã Bình Lục","Xã Bình Minh","Xã Bình Mỹ","Xã Bình Sơn","Xã Cát Thành","Xã Chất Bình","Xã Cổ Lễ","Xã Cúc Phương","Xã Đại Hoàng","Xã Định Hóa","Xã Đồng Thái","Xã Đồng Thịnh","Xã Gia Hưng","Xã Gia Lâm","Xã Gia Phong","Xã Gia Trấn","Xã Gia Tường","Xã Gia Vân","Xã Gia Viễn","Xã Giao Bình","Xã Giao Hoà","Xã Giao Hưng","Xã Giao Minh","Xã Giao Ninh","Xã Giao Phúc","Xã Giao Thuỷ","Xã Hải An","Xã Hải Anh","Xã Hải Hậu","Xã Hải Hưng","Xã Hải Quang","Xã Hải Thịnh","Xã Hải Tiến","Xã Hải Xuân","Xã Hiển Khánh","Xã Hồng Phong","Xã Khánh Hội","Xã Khánh Nhạc","Xã Khánh Thiện","Xã Khánh Trung","Xã Kim Đông","Xã Kim Sơn","Xã Lai Thành","Xã Liêm Hà","Xã Liên Minh","Xã Lý Nhân","Xã Minh Tân","Xã Minh Thái","Xã Nam Đồng","Xã Nam Hồng","Xã Nam Lý","Xã Nam Minh","Xã Nam Ninh","Xã Nam Trực","Xã Nam Xang","Xã Nghĩa Hưng","Xã Nghĩa Lâm","Xã Nghĩa Sơn","Xã Nhân Hà","Xã Nho Quan","Xã Ninh Cường","Xã Ninh Giang","Xã Phát Diệm","Xã Phong Doanh","Xã Phú Long","Xã Phú Sơn","Xã Quang Hưng","Xã Quang Thiện","Xã Quỹ Nhất","Xã Quỳnh Lưu","Xã Rạng Đông","Xã Tân Minh","Xã Tân Thanh","Xã Thanh Bình","Xã Thanh Lâm","Xã Thanh Liêm","Xã Thanh Sơn","Xã Trần Thương","Xã Trực Ninh","Xã Vạn Thắng","Xã Vĩnh Trụ","Xã Vụ Bản","Xã Vũ Dương","Xã Xuân Giang","Xã Xuân Hồng","Xã Xuân Hưng","Xã Xuân Trường","Xã Ý Yên","Xã Yên Cường","Xã Yên Đồng","Xã Yên Khánh","Xã Yên Mạc","Xã Yên Mô","Xã Yên Từ"],"Tỉnh Phú Thọ":["Phường Âu Cơ","Phường Hòa Bình","Phường Kỳ Sơn","Phường Nông Trang","Phường Phong Châu","Phường Phú Thọ","Phường Phúc Yên","Phường Tân Hòa","Phường Thanh Miếu","Phường Thống Nhất","Phường Vân Phú","Phường Việt Trì","Phường Vĩnh Phúc","Phường Vĩnh Yên","Phường Xuân Hòa","Xã An Bình","Xã An Nghĩa","Xã Bản Nguyên","Xã Bằng Luân","Xã Bao La","Xã Bình Nguyên","Xã Bình Phú","Xã Bình Tuyền","Xã Bình Xuyên","Xã Cẩm Khê","Xã Cao Dương","Xã Cao Phong","Xã Cao Sơn","Xã Chân Mộng","Xã Chí Đám","Xã Chí Tiên","Xã Cự Đồng","Xã Đà Bắc","Xã Đại Đình","Xã Đại Đồng","Xã Dân Chủ","Xã Đan Thượng","Xã Đạo Trù","Xã Đào Xá","Xã Đoan Hùng","Xã Đồng Lương","Xã Đông Thành","Xã Đức Nhàn","Xã Dũng Tiến","Xã Hạ Hòa","Xã Hải Lựu","Xã Hiền Lương","Xã Hiền Quan","Xã Hoàng An","Xã Hoàng Cương","Xã Hội Thịnh","Xã Hợp Kim","Xã Hợp Lý","Xã Hùng Việt","Xã Hương Cần","Xã Hy Cương","Xã Khả Cửu","Xã Kim Bôi","Xã Lạc Lương","Xã Lạc Sơn","Xã Lạc Thủy","Xã Lai Đồng","Xã Lâm Thao","Xã Lập Thạch","Xã Liên Châu","Xã Liên Hòa","Xã Liên Minh","Xã Liên Sơn","Xã Long Cốc","Xã Lương Sơn","Xã Mai Châu","Xã Mai Hạ","Xã Minh Đài","Xã Minh Hòa","Xã Mường Bi","Xã Mường Động","Xã Mường Hoa","Xã Mường Thàng","Xã Mường Vang","Xã Nật Sơn","Xã Ngọc Sơn","Xã Nguyệt Đức","Xã Nhân Nghĩa","Xã Pà Cò","Xã Phú Khê","Xã Phú Mỹ","Xã Phù Ninh","Xã Phùng Nguyên","Xã Quảng Yên","Xã Quy Đức","Xã Quyết Thắng","Xã Sơn Đông","Xã Sơn Lương","Xã Sông Lô","Xã Tam Đảo","Xã Tam Dương","Xã Tam Dương Bắc","Xã Tam Hồng","Xã Tam Nông","Xã Tam Sơn","Xã Tân Lạc","Xã Tân Mai","Xã Tân Pheo","Xã Tân Sơn","Xã Tây Cốc","Xã Tề Lỗ","Xã Thái Hòa","Xã Thanh Ba","Xã Thanh Sơn","Xã Thanh Thủy","Xã Thịnh Minh","Xã Thổ Tang","Xã Thọ Văn","Xã Thu Cúc","Xã Thung Nai","Xã Thượng Cốc","Xã Thượng Long","Xã Tiên Lữ","Xã Tiên Lương","Xã Tiền Phong","Xã Toàn Thắng","Xã Trạm Thản","Xã Trung Sơn","Xã Tu Vũ","Xã Vân Bán","Xã Văn Lang","Xã Văn Miếu","Xã Vân Sơn","Xã Vạn Xuân","Xã Vĩnh An","Xã Vĩnh Chân","Xã Vĩnh Hưng","Xã Vĩnh Phú","Xã Vĩnh Thành","Xã Vĩnh Tường","Xã Võ Miếu","Xã Xuân Đài","Xã Xuân Lãng","Xã Xuân Lũng","Xã Xuân Viên","Xã Yên Kỳ","Xã Yên Lạc","Xã Yên Lãng","Xã Yên Lập","Xã Yên Phú","Xã Yên Sơn","Xã Yên Thủy","Xã Yên Trị"],"Tỉnh Quảng Ngãi":["Đặc khu Lý Sơn","Phường Cẩm Thành","Phường Đăk Bla","Phường Đăk Cấm","Phường Đức Phổ","Phường Kon Tum","Phường Nghĩa Lộ","Phường Sa Huỳnh","Phường Trà Câu","Phường Trương Quang Trọng","Xã An Phú","Xã Ba Dinh","Xã Ba Động","Xã Ba Gia","Xã Ba Tơ","Xã Ba Tô","Xã Ba Vì","Xã Ba Vinh","Xã Ba Xa","Xã Bình Chương","Xã Bình Minh","Xã Bình Sơn","Xã Bờ Y","Xã Cà Đam","Xã Đăk Hà","Xã Đăk Kôi","Xã Đăk Long","Xã Đăk Mar","Xã Đăk Môn","Xã Đăk Pék","Xã Đăk Plô","Xã Đăk Pxi","Xã Đăk Rơ Wa","Xã Đăk Rve","Xã Đăk Sao","Xã Đăk Tô","Xã Đăk Tờ Kan","Xã Đăk Ui","Xã Đặng Thùy Trâm","Xã Đình Cương","Xã Đông Sơn","Xã Đông Trà Bồng","Xã Dục Nông","Xã Ia Chim","Xã Ia Đal","Xã Ia Tơi","Xã Khánh Cường","Xã Kon Braih","Xã Kon Đào","Xã Kon Plông","Xã Lân Phong","Xã Long Phụng","Xã Măng Bút","Xã Măng Đen","Xã Măng Ri","Xã Minh Long","Xã Mỏ Cày","Xã Mộ Đức","Xã Mô Rai","Xã Nghĩa Giang","Xã Nghĩa Hành","Xã Ngọc Linh","Xã Ngọk Bay","Xã Ngọk Réo","Xã Ngọk Tụ","Xã Nguyễn Nghiêm","Xã Phước Giang","Xã Rờ Kơi","Xã Sa Bình","Xã Sa Loong","Xã Sa Thầy","Xã Sơn Hà","Xã Sơn Hạ","Xã Sơn Kỳ","Xã Sơn Linh","Xã Sơn Mai","Xã Sơn Tây","Xã Sơn Tây Hạ","Xã Sơn Tây Thượng","Xã Sơn Thủy","Xã Sơn Tịnh","Xã Tây Trà","Xã Tây Trà Bồng","Xã Thanh Bồng","Xã Thiện Tín","Xã Thọ Phong","Xã Tịnh Khê","Xã Trà Bồng","Xã Trà Giang","Xã Trường Giang","Xã Tu Mơ Rông","Xã Tư Nghĩa","Xã Vạn Tường","Xã Vệ Giang","Xã Xốp","Xã Ya Ly"],"Tỉnh Quảng Ninh":["Đặc khu Cô Tô","Đặc khu Vân Đồn","Phường An Sinh","Phường Bãi Cháy","Phường Bình Khê","Phường Cẩm Phả","Phường Cao Xanh","Phường Cửa Ông","Phường Đông Mai","Phường Đông Triều","Phường Hà An","Phường Hà Lầm","Phường Hạ Long","Phường Hà Tu","Phường Hiệp Hòa","Phường Hoàng Quế","Phường Hoành Bồ","Phường Hồng Gai","Phường Liên Hòa","Phường Mạo Khê","Phường Móng Cái 1","Phường Móng Cái 2","Phường Móng Cái 3","Phường Mông Dương","Phường Phong Cốc","Phường Quang Hanh","Phường Quảng Yên","Phường Tuần Châu","Phường Uông Bí","Phường Vàng Danh","Phường Việt Hưng","Phường Yên Tử","Xã Ba Chẽ","Xã Bình Liêu","Xã Cái Chiên","Xã Đầm Hà","Xã Điền Xá","Xã Đông Ngũ","Xã Đường Hoa","Xã Hải Hòa","Xã Hải Lạng","Xã Hải Ninh","Xã Hải Sơn","Xã Hoành Mô","Xã Kỳ Thượng","Xã Lục Hồn","Xã Lương Minh","Xã Quảng Đức","Xã Quảng Hà","Xã Quảng La","Xã Quảng Tân","Xã Thống Nhất","Xã Tiên Yên","Xã Vĩnh Thực"],"Tỉnh Quảng Trị":["Đặc khu Cồn Cỏ","Phường Ba Đồn","Phường Bắc Gianh","Phường Đông Hà","Phường Đồng Hới","Phường Đồng Sơn","Phường Đồng Thuận","Phường Nam Đông Hà","Phường Quảng Trị","Xã A Dơi","Xã Ái Tử","Xã Ba Lòng","Xã Bắc Trạch","Xã Bến Hải","Xã Bến Quan","Xã Bố Trạch","Xã Cam Hồng","Xã Cam Lộ","Xã Cồn Tiên","Xã Cửa Tùng","Xã Cửa Việt","Xã Đakrông","Xã Dân Hóa","Xã Diên Sanh","Xã Đồng Lê","Xã Đông Trạch","Xã Gio Linh","Xã Hải Lăng","Xã Hiếu Giang","Xã Hòa Trạch","Xã Hoàn Lão","Xã Hướng Hiệp","Xã Hướng Lập","Xã Hướng Phùng","Xã Khe Sanh","Xã Kim Điền","Xã Kim Ngân","Xã Kim Phú","Xã La Lay","Xã Lao Bảo","Xã Lệ Ninh","Xã Lệ Thủy","Xã Lìa","Xã Minh Hóa","Xã Mỹ Thủy","Xã Nam Ba Đồn","Xã Nam Cửa Việt","Xã Nam Gianh","Xã Nam Hải Lăng","Xã Nam Trạch","Xã Ninh Châu","Xã Phong Nha","Xã Phú Trạch","Xã Quảng Ninh","Xã Quảng Trạch","Xã Sen Ngư","Xã Tà Rụt","Xã Tân Gianh","Xã Tân Lập","Xã Tân Mỹ","Xã Tân Thành","Xã Thượng Trạch","Xã Triệu Bình","Xã Triệu Cơ","Xã Triệu Phong","Xã Trung Thuần","Xã Trường Ninh","Xã Trường Phú","Xã Trường Sơn","Xã Tuyên Bình","Xã Tuyên Hóa","Xã Tuyên Lâm","Xã Tuyên Phú","Xã Tuyên Sơn","Xã Vĩnh Định","Xã Vĩnh Hoàng","Xã Vĩnh Linh","Xã Vĩnh Thủy"],"Tỉnh Sơn La":["Phường Chiềng An","Phường Chiềng Cơi","Phường Chiềng Sinh","Phường Mộc Châu","Phường Mộc Sơn","Phường Thảo Nguyên","Phường Tô Hiệu","Phường Vân Sơn","Xã Bắc Yên","Xã Bình Thuận","Xã Bó Sinh","Xã Chiềng Hặc","Xã Chiềng Hoa","Xã Chiềng Khoong","Xã Chiềng Khương","Xã Chiềng La","Xã Chiềng Lao","Xã Chiềng Mai","Xã Chiềng Mung","Xã Chiềng Sại","Xã Chiềng Sơ","Xã Chiềng Sơn","Xã Chiềng Sung","Xã Co Mạ","Xã Đoàn Kết","Xã Gia Phù","Xã Huổi Một","Xã Kim Bon","Xã Long Hẹ","Xã Lóng Phiêng","Xã Lóng Sập","Xã Mai Sơn","Xã Muổi Nọi","Xã Mường Bám","Xã Mường Bang","Xã Mường Bú","Xã Mường Chanh","Xã Mường Chiên","Xã Mường Cơi","Xã Mường É","Xã Mường Giôn","Xã Mường Hung","Xã Mường Khiêng","Xã Mường La","Xã Mường Lầm","Xã Mường Lạn","Xã Mường Lèo","Xã Mường Sại","Xã Nậm Lầu","Xã Nậm Ty","Xã Ngọc Chiến","Xã Pắc Ngà","Xã Phiêng Cằm","Xã Phiêng Khoài","Xã Phiêng Pằn","Xã Phù Yên","Xã Púng Bánh","Xã Quỳnh Nhai","Xã Song Khủa","Xã Sông Mã","Xã Sốp Cộp","Xã Suối Tọ","Xã Tà Hộc","Xã Tạ Khoa","Xã Tà Xùa","Xã Tân Phong","Xã Tân Yên","Xã Thuận Châu","Xã Tô Múa","Xã Tường Hạ","Xã Vân Hồ","Xã Xím Vàng","Xã Xuân Nha","Xã Yên Châu","Xã Yên Sơn"],"Tỉnh Tây Ninh":["Phường An Tịnh","Phường Bình Minh","Phường Gia Lộc","Phường Gò Dầu","Phường Hòa Thành","Phường Khánh Hậu","Phường Kiến Tường","Phường Long An","Phường Long Hoa","Phường Ninh Thạnh","Phường Tân An","Phường Tân Ninh","Phường Thanh Điền","Phường Trảng Bàng","Xã An Lục Long","Xã An Ninh","Xã Bến Cầu","Xã Bến Lức","Xã Bình Đức","Xã Bình Hiệp","Xã Bình Hòa","Xã Bình Thành","Xã Cần Đước","Xã Cần Giuộc","Xã Cầu Khởi","Xã Châu Thành","Xã Đông Thành","Xã Đức Hòa","Xã Đức Huệ","Xã Đức Lập","Xã Dương Minh Châu","Xã Hảo Đước","Xã Hậu Nghĩa","Xã Hậu Thạnh","Xã Hiệp Hòa","Xã Hòa Hội","Xã Hòa Khánh","Xã Hưng Điền","Xã Hưng Thuận","Xã Khánh Hưng","Xã Lộc Ninh","Xã Long Cang","Xã Long Chữ","Xã Long Hựu","Xã Long Thuận","Xã Lương Hòa","Xã Mộc Hóa","Xã Mỹ An","Xã Mỹ Hạnh","Xã Mỹ Lệ","Xã Mỹ Lộc","Xã Mỹ Quý","Xã Mỹ Thạnh","Xã Mỹ Yên","Xã Nhơn Hòa Lập","Xã Nhơn Ninh","Xã Nhựt Tảo","Xã Ninh Điền","Xã Phước Chỉ","Xã Phước Lý","Xã Phước Thạnh","Xã Phước Vinh","Xã Phước Vĩnh Tây","Xã Rạch Kiến","Xã Tầm Vu","Xã Tân Biên","Xã Tân Châu","Xã Tân Đông","Xã Tân Hòa","Xã Tân Hội","Xã Tân Hưng","Xã Tân Lân","Xã Tân Lập","Xã Tân Long","Xã Tân Phú","Xã Tân Tập","Xã Tân Tây","Xã Tân Thành","Xã Tân Thạnh","Xã Tân Trụ","Xã Thạnh Bình","Xã Thạnh Đức","Xã Thạnh Hóa","Xã Thạnh Lợi","Xã Thạnh Phước","Xã Thủ Thừa","Xã Thuận Mỹ","Xã Trà Vong","Xã Truông Mít","Xã Tuyên Bình","Xã Tuyên Thạnh","Xã Vàm Cỏ","Xã Vĩnh Châu","Xã Vĩnh Công","Xã Vĩnh Hưng","Xã Vĩnh Thạnh"],"Tỉnh Thái Nguyên":["Phường Bá Xuyên","Phường Bắc Kạn","Phường Bách Quang","Phường Đức Xuân","Phường Gia Sàng","Phường Linh Sơn","Phường Phan Đình Phùng","Phường Phổ Yên","Phường Phúc Thuận","Phường Quan Triều","Phường Quyết Thắng","Phường Sông Công","Phường Tích Lương","Phường Trung Thành","Phường Vạn Xuân","Xã An Khánh","Xã Ba Bể","Xã Bạch Thông","Xã Bằng Thành","Xã Bằng Vân","Xã Bình Thành","Xã Bình Yên","Xã Cẩm Giàng","Xã Cao Minh","Xã Chợ Đồn","Xã Chợ Mới","Xã Chợ Rã","Xã Côn Minh","Xã Cường Lợi","Xã Đại Phúc","Xã Đại Từ","Xã Dân Tiến","Xã Điềm Thụy","Xã Định Hóa","Xã Đồng Hỷ","Xã Đồng Phúc","Xã Đức Lương","Xã Hiệp Lực","Xã Hợp Thành","Xã Kha Sơn","Xã Kim Phượng","Xã La Bằng","Xã La Hiên","Xã Lam Vỹ","Xã Nà Phặc","Xã Na Rì","Xã Nam Cường","Xã Nam Hòa","Xã Ngân Sơn","Xã Nghĩa Tá","Xã Nghiên Loan","Xã Nghinh Tường","Xã Phong Quang","Xã Phú Bình","Xã Phú Đình","Xã Phú Lạc","Xã Phú Lương","Xã Phú Thịnh","Xã Phủ Thông","Xã Phú Xuyên","Xã Phúc Lộc","Xã Phượng Tiến","Xã Quân Chu","Xã Quảng Bạch","Xã Quang Sơn","Xã Sảng Mộc","Xã Tân Cương","Xã Tân Khánh","Xã Tân Kỳ","Xã Tân Thành","Xã Thần Sa","Xã Thành Công","Xã Thanh Mai","Xã Thanh Thịnh","Xã Thượng Minh","Xã Thượng Quan","Xã Trại Cau","Xã Trần Phú","Xã Tràng Xá","Xã Trung Hội","Xã Văn Hán","Xã Văn Lang","Xã Văn Lăng","Xã Vạn Phú","Xã Vĩnh Thông","Xã Võ Nhai","Xã Vô Tranh","Xã Xuân Dương","Xã Yên Bình","Xã Yên Phong","Xã Yên Thịnh","Xã Yên Trạch"],"Tỉnh Thanh Hóa":["Phường Bỉm Sơn","Phường Đào Duy Từ","Phường Đông Quang","Phường Đông Sơn","Phường Đông Tiến","Phường Hạc Thành","Phường Hải Bình","Phường Hải Lĩnh","Phường Hàm Rồng","Phường Nam Sầm Sơn","Phường Nghi Sơn","Phường Ngọc Sơn","Phường Nguyệt Viên","Phường Quảng Phú","Phường Quang Trung","Phường Sầm Sơn","Phường Tân Dân","Phường Tĩnh Gia","Phường Trúc Lâm","Xã An Nông","Xã Ba Đình","Xã Bá Thước","Xã Bát Mọt","Xã Biện Thượng","Xã Các Sơn","Xã Cẩm Tân","Xã Cẩm Thạch","Xã Cẩm Thủy","Xã Cẩm Tú","Xã Cẩm Vân","Xã Cổ Lũng","Xã Công Chính","Xã Điền Lư","Xã Điền Quang","Xã Định Hòa","Xã Định Tân","Xã Đồng Lương","Xã Đông Thành","Xã Đồng Tiến","Xã Giao An","Xã Hà Long","Xã Hà Trung","Xã Hậu Lộc","Xã Hiền Kiệt","Xã Hồ Vương","Xã Hoa Lộc","Xã Hóa Quỳ","Xã Hoằng Châu","Xã Hoằng Giang","Xã Hoằng Hóa","Xã Hoằng Lộc","Xã Hoằng Phú","Xã Hoằng Sơn","Xã Hoằng Thanh","Xã Hoằng Tiến","Xã Hoạt Giang","Xã Hồi Xuân","Xã Hợp Tiến","Xã Kiên Thọ","Xã Kim Tân","Xã Lam Sơn","Xã Linh Sơn","Xã Lĩnh Toại","Xã Luận Thành","Xã Lương Sơn","Xã Lưu Vệ","Xã Mậu Lâm","Xã Minh Sơn","Xã Mường Chanh","Xã Mường Lát","Xã Mường Lý","Xã Mường Mìn","Xã Na Mèo","Xã Nam Xuân","Xã Nga An","Xã Nga Sơn","Xã Nga Thắng","Xã Ngọc Lặc","Xã Ngọc Liên","Xã Ngọc Trạo","Xã Nguyệt Ấn","Xã Nhi Sơn","Xã Như Thanh","Xã Như Xuân","Xã Nông Cống","Xã Phú Lệ","Xã Phú Xuân","Xã Pù Luông","Xã Pù Nhi","Xã Quan Sơn","Xã Quảng Bình","Xã Quang Chiểu","Xã Quảng Chính","Xã Quảng Ngọc","Xã Quảng Ninh","Xã Quảng Yên","Xã Quý Lộc","Xã Quý Lương","Xã Sao Vàng","Xã Sơn Điện","Xã Sơn Thủy","Xã Tam Chung","Xã Tam Lư","Xã Tam Thanh","Xã Tân Ninh","Xã Tân Thành","Xã Tân Tiến","Xã Tây Đô","Xã Thạch Bình","Xã Thạch Lập","Xã Thạch Quảng","Xã Thăng Bình","Xã Thắng Lộc","Xã Thắng Lợi","Xã Thanh Kỳ","Xã Thanh Phong","Xã Thanh Quân","Xã Thành Vinh","Xã Thiên Phủ","Xã Thiết Ống","Xã Thiệu Hóa","Xã Thiệu Quang","Xã Thiệu Tiến","Xã Thiệu Toán","Xã Thiệu Trung","Xã Thọ Bình","Xã Thọ Lập","Xã Thọ Long","Xã Thọ Ngọc","Xã Thọ Phú","Xã Thọ Xuân","Xã Thượng Ninh","Xã Thường Xuân","Xã Tiên Trang","Xã Tống Sơn","Xã Triệu Lộc","Xã Triệu Sơn","Xã Trung Chính","Xã Trung Hạ","Xã Trung Lý","Xã Trung Sơn","Xã Trung Thành","Xã Trường Lâm","Xã Trường Văn","Xã Tượng Lĩnh","Xã Vân Du","Xã Vạn Lộc","Xã Văn Nho","Xã Văn Phú","Xã Vạn Xuân","Xã Vĩnh Lộc","Xã Xuân Bình","Xã Xuân Chinh","Xã Xuân Du","Xã Xuân Hòa","Xã Xuân Lập","Xã Xuân Thái","Xã Xuân Tín","Xã Yên Định","Xã Yên Khương","Xã Yên Nhân","Xã Yên Ninh","Xã Yên Phú","Xã Yên Thắng","Xã Yên Thọ","Xã Yên Trường"],"Tỉnh Tuyên Quang":["Phường An Tường","Phường Bình Thuận","Phường Hà Giang 1","Phường Hà Giang 2","Phường Minh Xuân","Phường Mỹ Lâm","Phường Nông Tiến","Xã Bắc Mê","Xã Bắc Quang","Xã Bạch Đích","Xã Bạch Ngọc","Xã Bạch Xa","Xã Bản Máy","Xã Bằng Hành","Xã Bằng Lang","Xã Bình An","Xã Bình Ca","Xã Bình Xa","Xã Cán Tỷ","Xã Cao Bồ","Xã Chiêm Hoá","Xã Côn Lôn","Xã Đồng Tâm","Xã Đông Thọ","Xã Đồng Văn","Xã Đồng Yên","Xã Du Già","Xã Đường Hồng","Xã Đường Thượng","Xã Giáp Trung","Xã Hàm Yên","Xã Hồ Thầu","Xã Hoà An","Xã Hoàng Su Phì","Xã Hồng Sơn","Xã Hồng Thái","Xã Hùng An","Xã Hùng Đức","Xã Hùng Lợi","Xã Khâu Vai","Xã Khuôn Lùng","Xã Kiên Đài","Xã Kiến Thiết","Xã Kim Bình","Xã Lâm Bình","Xã Lao Chải","Xã Liên Hiệp","Xã Linh Hồ","Xã Lực Hành","Xã Lũng Cú","Xã Lũng Phìn","Xã Lùng Tám","Xã Mậu Duệ","Xã Mèo Vạc","Xã Minh Ngọc","Xã Minh Quang","Xã Minh Sơn","Xã Minh Tân","Xã Minh Thanh","Xã Nà Hang","Xã Nấm Dẩn","Xã Nậm Dịch","Xã Nghĩa Thuận","Xã Ngọc Đường","Xã Ngọc Long","Xã Nhữ Khê","Xã Niêm Sơn","Xã Pà Vầy Sủ","Xã Phố Bảng","Xã Phú Linh","Xã Phú Lương","Xã Phù Lưu","Xã Pờ Ly Ngài","Xã Quản Bạ","Xã Quang Bình","Xã Quảng Nguyên","Xã Sà Phìn","Xã Sơn Dương","Xã Sơn Thuỷ","Xã Sơn Vĩ","Xã Sủng Máng","Xã Tân An","Xã Tân Long","Xã Tân Mỹ","Xã Tân Quang","Xã Tân Thanh","Xã Tân Tiến","Xã Tân Trào","Xã Tân Trịnh","Xã Tát Ngà","Xã Thái Bình","Xã Thái Hoà","Xã Thái Sơn","Xã Thắng Mố","Xã Thàng Tín","Xã Thanh Thủy","Xã Thông Nguyên","Xã Thuận Hoà","Xã Thượng Lâm","Xã Thượng Nông","Xã Thượng Sơn","Xã Tiên Nguyên","Xã Tiên Yên","Xã Tri Phú","Xã Trung Hà","Xã Trung Sơn","Xã Trung Thịnh","Xã Trường Sinh","Xã Tùng Bá","Xã Tùng Vài","Xã Vị Xuyên","Xã Việt Lâm","Xã Vĩnh Tuy","Xã Xín Mần","Xã Xuân Giang","Xã Xuân Vân","Xã Yên Cường","Xã Yên Hoa","Xã Yên Lập","Xã Yên Minh","Xã Yên Nguyên","Xã Yên Phú","Xã Yên Sơn","Xã Yên Thành"],"Tỉnh Vĩnh Long":["Phường An Hội","Phường Bến Tre","Phường Bình Minh","Phường Cái Vồn","Phường Đông Thành","Phường Duyên Hải","Phường Hòa Thuận","Phường Long Châu","Phường Long Đức","Phường Nguyệt Hóa","Phường Phú Khương","Phường Phú Tân","Phường Phước Hậu","Phường Sơn Đông","Phường Tân Hạnh","Phường Tân Ngãi","Phường Thanh Đức","Phường Trà Vinh","Phường Trường Long Hòa","Xã An Bình","Xã An Định","Xã An Hiệp","Xã An Ngãi Trung","Xã An Phú Tân","Xã An Qui","Xã An Trường","Xã Ba Tri","Xã Bảo Thạnh","Xã Bình Đại","Xã Bình Phú","Xã Bình Phước","Xã Cái Ngang","Xã Cái Nhum","Xã Càng Long","Xã Cầu Kè","Xã Cầu Ngang","Xã Châu Hòa","Xã Châu Hưng","Xã Châu Thành","Xã Chợ Lách","Xã Đại An","Xã Đại Điền","Xã Đôn Châu","Xã Đông Hải","Xã Đồng Khởi","Xã Giao Long","Xã Giồng Trôm","Xã Hàm Giang","Xã Hiệp Mỹ","Xã Hiếu Phụng","Xã Hiếu Thành","Xã Hòa Bình","Xã Hòa Hiệp","Xã Hòa Minh","Xã Hùng Hòa","Xã Hưng Khánh Trung","Xã Hưng Mỹ","Xã Hưng Nhượng","Xã Hương Mỹ","Xã Lộc Thuận","Xã Long Hiệp","Xã Long Hồ","Xã Long Hòa","Xã Long Hữu","Xã Long Thành","Xã Long Vĩnh","Xã Lục Sĩ Thành","Xã Lương Hòa","Xã Lương Phú","Xã Lưu Nghiệp Anh","Xã Mỏ Cày","Xã Mỹ Chánh Hòa","Xã Mỹ Long","Xã Mỹ Thuận","Xã Ngãi Tứ","Xã Ngũ Lạc","Xã Nhị Long","Xã Nhị Trường","Xã Nhơn Phú","Xã Nhuận Phú Tân","Xã Phong Thạnh","Xã Phú Phụng","Xã Phú Quới","Xã Phú Thuận","Xã Phú Túc","Xã Phước Long","Xã Phước Mỹ Trung","Xã Quới An","Xã Quới Điền","Xã Quới Thiện","Xã Song Lộc","Xã Song Phú","Xã Tam Bình","Xã Tam Ngãi","Xã Tân An","Xã Tân Hào","Xã Tân Hòa","Xã Tân Long Hội","Xã Tân Lược","Xã Tân Phú","Xã Tân Quới","Xã Tân Thành Bình","Xã Tân Thủy","Xã Tân Xuân","Xã Tập Ngãi","Xã Tập Sơn","Xã Thạnh Hải","Xã Thạnh Phong","Xã Thạnh Phú","Xã Thạnh Phước","Xã Thành Thới","Xã Thạnh Trị","Xã Thới Thuận","Xã Tiên Thủy","Xã Tiểu Cần","Xã Trà Côn","Xã Trà Cú","Xã Trà Ôn","Xã Trung Hiệp","Xã Trung Ngãi","Xã Trung Thành","Xã Vinh Kim","Xã Vĩnh Thành","Xã Vĩnh Xuân"]};
  const PDF_FONT_REGULAR_B64 = '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ADMAAAAHAEQBUgE4//8Adv/sBQkHOAImADMAAAAHAHUB4QE4//8Adv/sBQkHOAImADMAAAAHAKgA6wE4//8Adv/sBQkHJAImADMAAAAHAK4A5wE8//8Adv/sBQkG/QImADMAAAAHAGoBGwE4//8AjP/sBKoHNgImADkAAAAHAEQBKwE2//8AjP/sBKoHNgImADkAAAAHAHUBugE2//8AjP/sBKoHNgImADkAAAAHAKgAxAE2//8AjP/sBKoG+wImADkAAAAHAGoA9AE2//8ADwAABLsHNgImAD0AAAAHAHUBiAE2//8Abf/sA+oGAAImAEUAAAAHAEQA1QAA//8Abf/sA+oGAAImAEUAAAAHAHUBZAAA//8Abf/sA+oGAAImAEUAAAAGAKhuAP//AG3/7APqBewCJgBFAAAABgCuagT//wBt/+wD6gXFAiYARQAAAAcAagCeAAD//wBt/+wD6gZbAiYARQAAAAcArAD1AAv//wBc/kQD7AROAiYARwAAAAcAeQE///f//wBd/+wD8wYAAiYASQAAAAcARADFAAD//wBd/+wD8wYAAiYASQAAAAcAdQFUAAD//wBd/+wD8wYAAiYASQAAAAYAqF4A//8AXf/sA/MFxQImAEkAAAAHAGoAjgAA////xgAAAWcF/wImAI0AAAAGAESN////AJYAAAI3Bf8CJgCNAAAABgB1G//////PAAACLAX/AiYAjQAAAAcAqP8m//////+7AAACRAXEAiYAjQAAAAcAav9W/////wCMAAAD3wXsAiYAUgAAAAYArmEE//8AW//sBDQGAAImAFMAAAAHAEQAzwAA//8AW//sBDQGAAImAFMAAAAHAHUBXgAA//8AW//sBDQGAAImAFMAAAAGAKhoAP//AFv/7AQ0BewCJgBTAAAABgCuZAT//wBb/+wENAXFAiYAUwAAAAcAagCYAAD//wCI/+wD3AYAAiYAWQAAAAcARADHAAD//wCI/+wD3AYAAiYAWQAAAAcAdQFWAAD//wCI/+wD3AYAAiYAWQAAAAYAqGAA//8AiP/sA9wFxQImAFkAAAAHAGoAkAAA//8AFv5LA7AGAAImAF0AAAAHAHUBGwAA//8AFv5LA7AFxQImAF0AAAAGAGpVAP//ABwAAAUdBuMCJgAlAAAABwBwAMcBPv//AG3/7APqBa0CJgBFAAAABgBwbAj//wAcAAAFHQcOAiYAJQAAAAcAqgD0ATf//wBt/+wD6gXYAiYARQAAAAcAqgCZAAEAAgAc/k8FHQWwABYAGQAAAQEjBwYVFDMyNxcGIyImNTQ3AyEDIwEDIQMC8AItJjpxTjA0DUZaWWeph/2eicYCLKMB7/gFsPpQLVtWSBp5LGhWkGwBc/6EBbD8agKpAAIAbf5PA+oETgAtADcAACUmJwYjIiY1NCQzMzU0JiMiBhUjNDY2MzIWFxEUFxUjBwYVFDMyNxcGIyImNTQnMjY3NSMgFRQWAyQPB4GzoM0BAem0dHFjhrpzxXa71AQmITpxTjA0DUZaWWeIV5wjkf6sdAcmRYa1i6m7VWFzZEdRl1i7pP4OlVgQLVtWSBp5LGhWkPBaSN7HV2IA//8Ad//sBNgHVwImACcAAAAHAHUBxgFX//8AXP/sA+wGAAImAEcAAAAHAHUBMwAA//8Ad//sBNgHVwImACcAAAAHAKgA0AFX//8AXP/sA+wGAAImAEcAAAAGAKg9AP//AHf/7ATYBxkCJgAnAAAABwCrAa0BV///AFz/7APsBcICJgBHAAAABwCrARoAAP//AHf/7ATYB1cCJgAnAAAABwCpAOUBWP//AFz/7APsBgACJgBHAAAABgCpUgH//wCpAAAExgdCAiYAKAAAAAcAqQCeAUP//wBf/+wFKwYCACYASAAAAAcAuQPUBRP//wCpAAAERgbvAiYAKQAAAAcAcACSAUr//wBd/+wD8wWtAiYASQAAAAYAcFwI//8AqQAABEYHGgImACkAAAAHAKoAvwFD//8AXf/sA/MF2AImAEkAAAAHAKoAiQAB//8AqQAABEYHBAImACkAAAAHAKsBcQFC//8AXf/sA/MFwgImAEkAAAAHAKsBOwAAAAEAqf5PBEYFsAAbAAABIREhFSMHBhUUMzI3FwYjIiY1NDchESEVIREhA+D9iQLdSTpxTjA0DUZaWWeb/V0Dk/0tAncCof38nS1bVkgaeSxoVoppBbCe/iwAAAIAXf5oA/METgAlAC0AACUGBzMHBhUUMzI3FwYjIiY1NDcmADU1NDY2MzISERUhFhYzMjY3ASIGByE1JiYD5UdzATpxTjA0DUZaWWdi2v71e92B0+r9IwSzimKIM/7CcJgSAh4IiL1uNi1bVkgaeSxoVmxaBAEh7yGh/Y/+6v79TaDFUEICoaOTDo2bAP//AKkAAARGB0ICJgApAAAABwCpAKkBQ///AF3/7APzBgACJgBJAAAABgCpcwH//wB6/+wE3AdXAiYAKwAAAAcAqADIAVf//wBg/lYD8gYAAiYASwAAAAYAqFUA//8Aev/sBNwHLwImACsAAAAHAKoA8wFY//8AYP5WA/IF2AImAEsAAAAHAKoAgAAB//8Aev/sBNwHGQImACsAAAAHAKsBpQFX//8AYP5WA/IFwgImAEsAAAAHAKsBMgAA//8Aev32BNwFxAImACsAAAAHALkB2v6X//8AYP5WA/IGkwImAEsAAAAHAL8BKwBY//8AqQAABQgHQgImACwAAAAHAKgA8QFC//8AjAAAA98HQQImAEwAAAAHAKgAHQFB////twAAAnoHLgImAC0AAAAHAK7/PAFG////nQAAAmAF6gImAI0AAAAHAK7/IgAC////zAAAAmwG7wImAC0AAAAHAHD/PgFK////sgAAAlIFqwImAI0AAAAHAHD/JAAG////7AAAAkMHGgImAC0AAAAHAKr/awFD////0gAAAikF1wImAI0AAAAHAKr/UQAA//8AGP5YAXgFsAImAC0AAAAGAK3mCf////v+TwFoBcQCJgBNAAAABgCtyQD//wCpAAABhAcEAiYALQAAAAcAqwAcAUL//wC3/+wF+QWwACYALQAAAAcALgItAAD//wCN/ksDSgXEACYATQAAAAcATgHxAAD//wA1/+wEggc1AiYALgAAAAcAqAF8ATX///+0/ksCOQXYAiYApwAAAAcAqP8z/9j//wCp/lgFBQWwAiYALwAAAAcAuQGU/vn//wCN/kUEDAYAAiYATwAAAAcAuQER/ub//wChAAAEHAcxAiYAMAAAAAcAdQAmATH//wCTAAACNAeWAiYAUAAAAAcAdQAYAZb//wCp/gkEHAWwAiYAMAAAAAcAuQFs/qr//wBX/gkBVQYAAiYAUAAAAAcAuf/7/qr//wCpAAAEHAWxAiYAMAAAAAcAuQHVBML//wCcAAACrQYCACYAUAAAAAcAuQFWBRP//wCpAAAEHAWwAiYAMAAAAAcAqwG8/cX//wCcAAACoAYAACYAUAAAAAcAqwE4/bb//wCpAAAFCAc2AiYAMgAAAAcAdQH1ATb//wCMAAAD3wYAAiYAUgAAAAcAdQFbAAD//wCp/gkFCAWw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AAAABwDFAI//+P//ABwAAAUdB7cCJgAlAAAABwDAAOoBLf//AG3/7APqBoICJgBFAAAABwDAAI//+P//ABwAAAUdCEACJgAlAAAABwDGAO4BPf//AG3/7APqBwoCJgBFAAAABwDGAJMAB///ABwAAAUdCBUCJgAlAAAABwDHAO4BRf//AG3/7APqBt8CJgBFAAAABwDHAJMAD///ABz+ogUdBw4CJgAlAAAAJwCqAPQBNwAHALEFAgAA//8Abf6iA+oF2AImAEUAAAAnAKoAmQABAAcAsQRKAAD//wCp/qwERgWwAiYAKQAAAAcAsQTAAAr//wBd/qID8wROAiYASQAAAAcAsQSMAAD//wCpAAAERgfGAiYAKQAAAAcAsAS5AVL//wBd/+wD8waEAiYASQAAAAcAsASDABD//wCpAAAERgcuAiYAKQAAAAcArgCQAUb//wBd/+wD8wXsAiYASQAAAAYArloE//8AqQAABOYHzwImACkAAAAHAMEAjgE6//8AXf/sBLAGjgImAEkAAAAGAMFY+f////AAAARGB8sCJgApAAAABwDCAJIBSf///7r/7APzBokCJgBJAAAABgDCXAf//wCpAAAEfwf2AiYAKQAAAAcAwwCTASf//wBd/+wESQa1AiYASQAAAAYAw13m//8AqQAABEYH5gImACkAAAAHAMQAkgES//8AXf/sA/MGpQImAEkAAAAGAMRc0f//AKn+rARGB0ICJgApAAAAJwCoAJQBQgAHALEEwAAK//8AXf6iA/MGAAImAEkAAAAmAKheAAAHALEEjAAA//8AtwAAAfgHxgImAC0AAAAHALADZAFS//8AmwAAAd4GggImAI0AAAAHALADSgAO//8Ao/6rAX4FsAImAC0AAAAHALEDawAJ//8Ahf6sAWgFxAImAE0AAAAHALEDTQAK//8Adv6iBQkFxAImADMAAAAHALEFGAAA//8AW/6iBDQETgImAFMAAAAHALEEnQAA//8Adv/sBQkHvAImADMAAAAHALAFEAFI//8AW//sBDQGhAImAFMAAAAHALAEjQAQ//8Adv/sBT0HxQImADMAAAAHAMEA5QEw//8AW//sBLoGjgImAFMAAAAGAMFi+f//AEf/7AUJB8ECJgAzAAAABwDCAOkBP////8T/7AQ0BokCJgBTAAAABgDCZgf//wB2/+wFCQfs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A58AgQOeAIEDpACDAfsAAAI1ACUFXQAHBV0ABwSG/+IExgAxAp3/9AU4ABwFOAAcBTgAHAU4ABwFOAAcBTgAHAU1AHcEjACpBIwAqQSMAKkEjACpAi3/4AItALACLf/pAi3/1QW0AKkFgAB2BYAAdgWAAHYFgAB2BYAAdgUwAIwFMACMBTAAjAUwAIwEzgAPBFoAbQRaAG0EWgBtBFoAbQRaAG0EWgBtBDAAXAQ9AF0EPQBdBD0AXQQ9AF0B+v/GAfoAlgH6/88B+v+7BGoAjASQAFsEkABbBJAAWwSQAFsEkABbBGkAiARpAIgEaQCIBGkAiAPJABYDyQAWBTgAHARaAG0FOAAcBFoAbQU4ABwEWgBtBTUAdwQwAFwFNQB3BDAAXAU1AHcEMABcBTUAdwQwAFwFPwCpBRkAXwSMAKkEPQBdBIwAqQQ9AF0EjACpBD0AXQSMAKkEPQBdBIwAqQQ9AF0FcwB6BH0AYAVzAHoEfQBgBXMAegR9AGAFcwB6BH0AYAW0AKkEaACMAi3/twH6/50CLf/MAfr/sgIt/+wB+v/SAi0AGAHx//sCLQCpBpcAtwPaAI0EagA1AgP/tAUEAKkEDgCNBE4AoQHxAJMETgCpAfEAVwROAKkChwCcBE4AqQLNAJwFtACpBGoAjAW0AKkEagCMBbQAqQRqAIwEav+8BYAAdgSQAFsFgAB2BJAAWwWAAHYEkABbBO0AqAK1AIwE7QCoArUAUwTtAKgCtQBjBL8AUAQgAF8EvwBQBCAAXwS/AFAEIABfBL8AUAQgAF8ExgAxAp0ACQTGADECxQAJBTAAjARpAIgFMACMBGkAiAUwAIwEaQCIBTAAjARpAIgFMACMBGkAiAUwAIwEaQCIBxkAPQYDACsEzgAPA8kAFgTOAA8EygBWA/cAWATKAFYD9wBYBMoAVgP3AFgEzgAPA8kAFgU4ABwEWgBtBTgAHARaAG0FOAAcBFoAbQU4ABwEWv/KBTgAHARaAG0FOAAcBFoAbQU4ABwEWgBtBTgAHARaAG0FOAAcBFoAbQU4ABwEWgBtBTgAHARaAG0FOAAcBFoAbQSMAKkEPQBdBIwAqQQ9AF0EjACpBD0AXQSMAKkEPQBdBIz/8AQ9/7oEjACpBD0AXQSMAKkEPQBdBIwAqQQ9AF0CLQC3AfoAmwItAKMB8QCFBYAAdgSQAFsFgAB2BJAAWwWAAHYEkABbBYAARwSQ/8QFgAB2BJAAWwWAAHYEkABbBYAAdgSQAFsFfgBlBJIAWwV+AGUEkgBbBX4AZQSSAFsFfgBlBJIAWwV+AGUEkgBbBTAAjARpAIgFMACMBGkAiAWQAIwE8wCIBZAAjATzAIgFkACMBPMAiAWQAIwE8wCIBZAAjATzAIgEzgAPA8kAFgTOAA8DyQAWBM4ADwPJABYEoQBfAAEAAAhi/dUAAAqW+N/79wqWAAEAAAAAAAAAAAAAAAAAAAHQAAMEhgGQAAUAAAWaBTMAAAEfBZoFMwAAA9EAZgIAAAACAAAAAAAAAAAAoAAADwAAAAIAAAAAAAAAAEdPT0cAQAAAIKsIYv3VAAAIYgIrAAABkwAAAAAEOgWwACAAIAADAAAAAgAAAAMAAAAUAAMAAQAAABQABAGwAAAAPgAgAAQAHgAAAAIACQANAH4AoACsAK0AvwDGAM8A5gDvAP4BDwERASUBJwEwAVMBZQFnAX4BfwGwHvEe8x75IBQgq///AAAAAAACAAkADQAgAKAAoQCtAK4AwADHANAA5wDwAP8BEAESASYBKAExAVQBZgFoAX8BoB6gHvIe9CATIKv//wAA////+f/2/+QAKP/CABz/wQAAAA4AAAAIAAAABAAAAAIAAAAAAAD/+P9n//b/Fv724tfig+LV4KDhJAABAAAAAAAAAAAAAAAAAAAAAAAAACwAAAA2AAAAYAAAAHoAAAB6AAAAegAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAzwDQANEA0gDTANQAgQDLAN4A3wDgAOEA4gDjAIIAgwDkAOUA5gDnAOgAhACFAOkA6gDrAOwA7QDuAIYAhwD4APkA+gD7APwA/QCIAIkA/gD/AQABAQECAIoAygCLAIwAzACNATEBMgEzATQBNQE2AI4BNwE4ATkBOgE7ATwBPQE+AI8AkAE/AUABQQFCAUMBRAFFAJEAkgFGAUcBSAFJAUoBSwCTAJQAAAAHAFoAAwABBAkAAABeAAAAAwABBAkAAQAMAF4AAwABBAkAAgAOAGoAAwABBAkAAwA0AHgAAwABBAkABAAcAKwAAwABBAkABQAsAMgAAwABBAkABgAcAPQAQwBvAHAAeQByAGkAZwBoAHQAIAAyADAAMQA1ACAARwBvAG8AZwBsAGUAIABJAG4AYwAuACAAQQBsAGwAIABSAGkAZwBoAHQAcwAgAFIAZQBzAGUAcgB2AGUAZAAuAFIAbwBiAG8AdABvAFIAZQBnAHUAbABhAHIARwBvAG8AZwBsAGUAOgBSAG8AYgBvAHQAbwAgAFIAZQBnAHUAbABhAHIAOgAyADAAMQA1AFIAbwBiAG8AdABvACAAUgBlAGcAdQBsAGEAcgBWAGUAcgBzAGkAbwBuACAAMgAuADAAMAAxADAANAA3ADsAIAAyADAAMQA1AFIAbwBiAG8AdABvAC0AUgBlAGcAdQBsAGEAcgAAAAMAAAAAAAD/agBkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQACAAgAAv//AA8AAQAAAAwAAAAAAAAAAgAMACUAPgABAEUAXgABAHkAeQADAIEAgQABAIMAgwABAIYAhgABAIkAiQABAIsAlwABAJ8AnwABAKUApgABAMoBMAABATMBzwABAAEAAAAKABwAHgABREZMVAAIAAQAAAAA//8AAAAAAAAAAQAAAAoAMgA0AARERkxUABpjeXJsACRncmVrACRsYXRuACQABAAAAAD//wAAAAAAAAAAAAAAAA==';
  const PDF_FONT_BOLD_B64 = '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BDMAEP//AAcAAAVcB6UCJgAlAAAABwDFAO0BN///AET/7AQGBm8CJgBFAAAABgDFYAH//wAHAAAFXAelAiYAJQAAAAcAwADtATf//wBE/+wEBgZvAiYARQAAAAYAwGAB//8ABwAABVwIOAImACUAAAAHAMYA5wEu//8ARP/sBAYHAwImAEUAAAAGAMZa+f//AAcAAAVcCBcCJgAlAAAABwDHAO0BM///AET/7AQGBuICJgBFAAAABgDHYP7//wAH/pEFXAcsAiYAJQAAACcAqgDxATYABwCxBREABv//AET+mwQGBfYCJgBFAAAAJgCqZAAABwCxBDMAEP//AIL+lQRSBbACJgApAAAABwCxBNQACv//AEj+iwQeBE4CJgBJAAAABwCxBJAAAP//AIIAAARSB70CJgApAAAABwCwBNwBN///AEj/7AQeBoUCJgBJAAAABwCwBIH/////AIIAAARSBzYCJgApAAAABwCuAI0BN///AEj/7AQeBf4CJgBJAAAABgCuMv///wCCAAAFKAeYAiYAKQAAAAcAwQCIARb//wBI/+wEzQZgAiYASQAAAAYAwS3e////zQAABFIHlwImACkAAAAHAMIAiAEb////cv/sBB4GXwImAEkAAAAGAMIt4///AIIAAASiB9ACJgApAAAABwDDAIYBEP//AEj/7ARHBpgCJgBJAAAABgDDK9j//wCCAAAEUgfSAiYAKQAAAAcAxACIAQv//wBI/+wEHgaaAiYASQAAAAYAxC3T//8Agv6VBFIHOQImACkAAAAnAKgAhAE5AAcAsQTUAAr//wBI/osEHgYAAiYASQAAACYAqCkAAAcAsQSQAAD//wCVAAACLAe9AiYALQAAAAcAsAOLATf//wCGAAACGgZ1AiYAjQAAAAcAsAN5/+///wCI/o0BywWwAiYALQAAAAcAsQOBAAL//wBt/pUBsQXnAiYATQAAAAcAsQNmAAr//wBW/osFLgXEAiYAMwAAAAcAsQUeAAD//wBC/oUEQwROAiYAUwAAAAcAsQSZ//r//wBW/+wFLge6AiYAMwAAAAcAsAUjATT//wBC/+wEQwaFAiYAUwAAAAcAsASh/////wBW/+wFbweVAiYAMwAAAAcAwQDPARP//wBC/+wE7QZgAiYAUwAAAAYAwU3e//8AFP/sBS4HlAImADMAAAAHAMIAzwEY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AvoANQPSAI0CAQCFA50AagQHAIMEB/9FBAcAhAQHAIQDnQBqA50AagOdAGoB/gAAAxoAbgVR/+wFUf/sBJj/ywTzACgCtP/iBWIABwViAAcFYgAHBWIABwViAAcFYgAHBTwAVgSAAIIEgACCBIAAggSAAIICVf+6AlUAlQJV/68CVf+tBaYAggWGAFYFhgBWBYYAVgWGAFYFhgBWBUQAdAVEAHQFRAB0BUQAdATyAAIESgBEBEoARARKAEQESgBEBEoARARKAEQELABCBFMASARTAEgEUwBIBFMASAIx/6gCMQCGAjH/nQIx/5sEewBpBIYAQgSGAEIEhgBCBIYAQgSGAEIEegBoBHoAaAR6AGgEegBoBAQAAwQEAAMFYgAHBEoARAViAAcESgBEBWIABwRKAEQFPABWBCwAQgU8AFYELABCBTwAVgQsAEIFPABWBCwAQgUzAIIFGABCBIAAggRTAEgEgACCBFMASASAAIIEUwBIBIAAggRTAEgEgACCBFMASAVzAF4EkQBFBXMAXgSRAEUFcwBeBJEARQVzAF4EkQBFBacAggR6AGgCVf+yAjH/oAJV/9QCMf/CAlX/0gIx/8ACVQAXAh8AAwJVAJUGzQCVBDMAbQR4ACgCQf+XBRQAggRGAG8EVQCCAh8AfgRVAIICHwBbBFUAggK1AH4EVQCCAvsAfgWmAIIEewBpBaYAggR7AGkFpgCCBHsAaQR7/5IFhgBWBIYAQgWGAFYEhgBCBYYAVgSGAEIFGwCCAusAbwUbAIIC6wBQBRsAggLrABEE6wBFBB0AOATrAEUEHQA4BOsARQQdADgE6wBFBB0AOATzACgCtAAKBPMAKALcAAoFRAB0BHoAaAVEAHQEegBoBUQAdAR6AGgFRAB0BHoAaAVEAHQEegBoBUQAdAR6AGgG/wAjBeEAHATyAAIEBAADBPIAAgTZAEkEEgBKBNkASQQSAEoE2QBJBBIASgTyAAIEBAADBWIABwRKAEQFYgAHBEoARAViAAcESgBEBWIABgRK/3kFYgAHBEoARAViAAcESgBEBWIABwRKAEQFYgAHBEoARAViAAcESgBEBWIABwRKAEQFYgAHBEoARAViAAcESgBEBIAAggRTAEgEgACCBFMASASAAIIEUwBIBIAAggRTAEgEgP/NBFP/cgSAAIIEUwBIBIAAggRTAEgEgACCBFMASAJVAJUCMQCGAlUAiAIfAG0FhgBWBIYAQgWGAFYEhgBCBYYAVgSGAEIFhgAUBIb/kgWGAFYEhgBCBYYAVgSGAEIFhgBWBIYAQgWcAFAEpgBABZwAUASmAEAFnABQBKYAQAWcAFAEpgBABZwAUASmAEAFRAB0BHoAaAVEAHQEegBoBbMAdAThAGgFswB0BOEAaAWzAHQE4QBoBbMAdAThAGgFswB0BOEAaATyAAIEBAADBPIAAgQEAAME8gACBAQAAwSgAEIAAQAACGL91QAACtz4svubCu0AAQAAAAAAAAAAAAAAAAAAAdAAAwSnArwABQAABZoFMwAAAR8FmgUzAAAD0QBmAgAAAAIAAAAAAAAAAACgAAAPAAAAAgAAAAAAAAAAR09PRwAgAAAgqwhi/dUAAAhiAisAAAGTAAAAAAQ6BbAAIAAgAAMAAAACAAAAAwAAABQAAwABAAAAFAAEAbAAAAA+ACAABAAeAAAAAgAJAA0AfgCgAKwArQC/AMYAzwDmAO8A/gEPAREBJQEnATABUwFlAWcBfgF/AbAe8R7zHvkgFCCr//8AAAAAAAIACQANACAAoAChAK0ArgDAAMcA0ADnAPAA/wEQARIBJgEoATEBVAFmAWgBfwGgHqAe8h70IBMgq///AAD////5//b/5AAo/8IAHP/BAAAADgAAAAgAAAAEAAAAAgAAAAAAAP/4/2f/9v8W/vbi1+KD4tXgoOEkAAEAAAAAAAAAAAAAAAAAAAAAAAAALAAAADYAAABgAAAAegAAAHoAAAB6AAAAAAAAAAAAAAAAAAAAAAAAAAAAAADPANAA0QDSANMA1ACBAMsA3gDfAOAA4QDiAOMAggCDAOQA5QDmAOcA6ACEAIUA6QDqAOsA7ADtAO4AhgCHAPgA+QD6APsA/AD9AIgAiQD+AP8BAAEBAQIAigDKAIsAjADMAI0BMQEyATMBNAE1ATYAjgE3ATgBOQE6ATsBPAE9AT4AjwCQAT8BQAFBAUIBQwFEAUUAkQCSAUYBRwFIAUkBSgFLAJMAlAAAAAcAWgADAAEECQAAAF4AAAADAAEECQABAAwAXgADAAEECQACAAgAagADAAEECQADAC4AcgADAAEECQAEABYAoAADAAEECQAFACwAtgADAAEECQAGABYA4gBDAG8AcAB5AHIAaQBnAGgAdAAgADIAMAAxADUAIABHAG8AbwBnAGwAZQAgAEkAbgBjAC4AIABBAGwAbAAgAFIAaQBnAGgAdABzACAAUgBlAHMAZQByAHYAZQBkAC4AUgBvAGIAbwB0AG8AQgBvAGwAZABHAG8AbwBnAGwAZQA6AFIAbwBiAG8AdABvACAAQgBvAGwAZAA6ADIAMAAxADUAUgBvAGIAbwB0AG8AIABCAG8AbABkAFYAZQByAHMAaQBvAG4AIAAyAC4AMAAwADEAMAA0ADcAOwAgADIAMAAxADUAUgBvAGIAbwB0AG8ALQBCAG8AbABkAAAAAwAAAAAAAP9qAGQAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAIACAAC//8ADwABAAAADAAAAAAAAAACAAwAJQA+AAEARQBeAAEAeQB5AAMAgQCBAAEAgwCDAAEAhgCGAAEAiQCJAAEAiwCXAAEAnwCfAAEApQCmAAEAygEwAAEBMwHPAAEAAQAAAAoAHAAeAAFERkxUAAgABAAAAAD//wAAAAAAAAABAAAACgAyADQABERGTFQAGmN5cmwAJGdyZWsAJGxhdG4AJAAEAAAAAP//AAAAAAAAAAAAAAAA';
  const DEFAULT_LOGO_B64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAQDAwMDAgQDAwMEBAQFBgoGBgUFBgwICQcKDgwPDg4MDQ0PERYTDxAVEQ0NExoTFRcYGRkZDxIbHRsYHRYYGRj/2wBDAQQEBAYFBgsGBgsYEA0QGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBj/wAARCAGaAZADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD7+ooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAoozXN67498IeG9y6x4gsreResIffJ/3wuT+lOMXJ2SMq2IpUI89WSiu7dvzOkorxXWP2j/DdqWTRdHv9QYdHlIgQ/zP6Vw2p/tF+MrosNNsNMsFPQ7GlYfiSB+ldcMBXn0t6nzGL43yjDae15n/AHU3+O34n1FkUua+Mb34u/Ea/J83xTdRA/w26pEP/HQDWFc+LvFV4c3XiXVpc9d13If610xymp1kjwa3iZg4/wAOjJ+tl/mfdRYDqaNy/wB4V8DPqWoynMt/dP8A70zH+tMF5eKci7nB9RI3+NX/AGS/5/wOT/iJ8P8AoGf/AIF/9qffuRRkV8FRa7rducwazqMR9UuXH9a2LT4i+O7Ej7N4t1YY7PcGQfk2al5TPpI2p+J2Gf8AEoSXo0/8j7cyPWlr5F0747fEWyI87UbW+Udrm2Xn8V2muz0n9pa4XamueGI3HeSynIP/AHyw/rWE8urR2Vz2sLx/lFfScnD1X+Vz6HorzjRPjh8PtZKxvqr6bM3/ACzv4zGP++hlf1rv7O9tL+1FzZXUNxC33ZIXDqfxFcc6U4fErH1OEzHC4xc2HqKXo0yxRRkUVB2BRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRUc00UELSzSJHGg3M7nAUepJ6V4z44+P+k6UZdP8JQpql2PlN25IgjPt3f8ADA961pUZ1XaCPNzLN8JltP2uKmor8X6LqewX2pWGl2T3mpXkFpboMtLO4RR+JryDxV+0PoGnGS28M2UmrTjjz5CYoB9P4m/IfWvn7xF4r8QeK9QN5r2qT3jg5RGOI4/ZVHArFr2KGVxjrUdz8rzfxGxFVungI8ke71f3bL8TtfEnxW8ceJy8d5rMtrbN/wAu1l+5THoccn8Sa4sksSSck9Se9JRXpQpxgrRVj89xWOxGLnz4ibk/N3CiiirOUKKKMe9ABRRx6ijI/vCgLBRRjPTmigAooooAK0dJ17WdBuxc6Nql3YS9d1vIVB+o6H8azqKTimrM0pVZ0pKdNtNdVoe0eGP2ifEFgUg8TWEOqQDgzw4imA9cfdb8hXt/hX4k+EfGCKukaoguSMmzuP3cw/4Cev4Zr4opyO8cqyI7I6nKspwQfUGuCtl1KesdGfa5Tx9mODahXftY+e/3/wCdz9As0V8peDPjt4m8PGOz1vdrVgMDMrYnjHs/8X0b86+ivCfjfw54y077VoeoLKyjMlu/yyxf7y9fx6e9eNXwlSj8S07n6vkvFGBzZWoytP8Alej+Xf5HR0UUVzH0QUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRQSB1oAM461zHjLx3oHgjSvtmsXX7xgfJtY+ZZj/sj09zwK5f4nfF3TvBUL6Xpvl32uMvEWcpb56NJjv6L1PsK+WdY1nU9f1ibVNXvZbu7lOWkkP5ADsB2A4r0cJgJVfenovzPg+J+NaWWXw+FtKr+EfXu/L7zqvHnxT8R+Obl4Z5jZaWD8lhA3ykdi5/jP149q4aiivep0401yxVkfimNx1fG1XWxE3KT6sKKKv6Romra9qS2GjafcX1y3SOBNxA9T2A9zVNpK7OenSnVkoQV2+iKFORHkkWONGd24CqMk/QV7v4U/ZzupxHdeMNS8hTybKyO5vo0h4H4A/WvafDvgbwp4ViC6HottbPjBnK75W+rnJ/WvPrZlThpDVn3eVeH2PxaU8S1Sj56v7v8ANo+VdB+Efj7xAqyW+gy2sLcia+PkLj1wfmP5V6LpP7NM7APrviZE9YrKHd/48xH8q+hgAKWvOqZlWltofeYHw/yrDpOqnUfm7L7lb9TyvT/2fvh9ZgG5g1C/YdTPclQfwTbXSWnws+HlmAIvCOmnHeWPzD/48TXYUVyyxFWW8mfR0Miy6h/DoRX/AG6jEj8G+EYRiLwvo6fSzj/wp58J+FmGD4b0kj3tI/8ACtiis+eXc7VhKCVlBfcjm7n4feBrpSJ/CWjt24tUX+QrCvvgn8N74H/inUtif4raaSP9M4/SvQaKqNapHaTOerlOCrK1SjF+sV/keJap+zb4cnVm0jW9Rsn7LMFmUf8AoJ/WuD1r9nrxrp6tJpk1jq0Y6CN/KkP/AAFuP1r6ppCM10wzCtHrc8HGcD5RiVpS5H3i2vw1X4Hwdq/h7XNAuPI1rSLywfOB58RUH6HofwNZuK+/bqztb21a2vLaK4hYYaOVA6n6g15h4p+Ang7Ww82kK+iXZ53W/wA0RPvGen4EV30s1i9KisfE5n4bV6d54Kpzrs9H9+z/AAPlGiu68X/Cbxh4P3z3Nl9usF/5fbMF1A/2h1X8ePeuFr04VI1FeLufnmMwGIwVT2WJg4y8/wCtQq1p2pahpGpxahpd5NaXURyk0LbWH/1vaqtFU0mrM5oTlCSlB2aPpP4dfHm11R4tH8ZGKzvDhI79flilP+2P4D79PpXt6OroGVgwIyCDkGvz9r1X4ZfGTUvCMsWk620t9omQoyd0lr7p6r/s/l6V5GLy77dL7j9V4Z4+aaw2ZvTpP/5L/P7+59X0VU03U7DWNKg1LTbqK5tZ13xyxnIYf57VbrxWraH6zGSmlKLumFFFFBQUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRQTgZoAK8d+LnxeTwzHJ4e8OSpJrLjE04+ZbQEfq/t26mrfxg+KSeENNOi6NKra5cp94c/ZUP8Z/2j2H4/X5WmlknneaaRpJXYs7ucliepJ7k16mAwXP+8nsfm3GfF/1NPA4KX7z7T/l8l5/l6hPPNc3Ek9xK8ssjFnkdtzMTySSepqOiiveSsfi8pOTuwpVUs4VVLMTgADJJ9K0dC0HVvEutxaTotm91dS9FXoo7sx7Aepr6l+HPwe0fwZHHqOoCPUdbwCZ2GUgPpGD/AOhHn6Vy4nFwoLXV9j6Ph/hjFZzU/drlpreT29F3f9M8u8A/AXVNaEWpeLXl0yxPzLaLxPKPf+4P19hX0RoPhvRPDOmLYaHpsFnAvURry59Wbqx9zWtiivn6+KqVneT07H7jkvDmCymFqEfe6ye7/wAvRBRRRXOe6FFFB6UAFFfHfxE/aK+JOj/FTXdG0a7sLSxsLyS1ijNqshIQ7dxZucnGa5n/AIab+Ln/AEGbD/wAj/wrtjgKkknofL1eLcDSm4NSunbb/gn3VRXzx+zv8WPGvxE8Xa1YeKL62uILWzSaIRWyxEMXwckdeKtfF74p+MPCXxGOjaHd20FqtrHLh4FkJZs5OT9BWccJOVT2S3OjE8S4TD4FZhNPkbttrf7/ACPfaK+Rf+F8fEn/AKCtp/4Bp/hR/wAL4+JP/QVtP/ANP8K6P7LreR4P/ERsq7T+5f5n11RXjPwS+Inifxpq+r2niC4gnW3hjkiaOERkEsQRx16CvZq461KVKThLc+tyrM6OZ4aOKoX5XfffR2Ciiisj0RGUMpBAIPUV5Z46+CHhzxOst9pATR9TbJ3wp+5lP+2g6fUYP1r1SitKdWdN80HY4cfluGx9J0sTBSXn09H0+R8MeKfB+v8Ag7VjYa7YtAx/1cq/NHKPVW7/AE6j0rCr7y1vQdK8RaRLpms2MN3ayDlJB0PqD1B9xXy98TPg7qfg2STVdI8y/wBEzkvjMlt7PjqP9ofjivcwuYRq+7PRn4zxLwPWy5PEYS86XXvH17rz+88uooIxRXpHwJ3fw2+Jmp+AtXCHfdaPM2bizz0/209G/Q9/WvrnRdZ07xBolvq2k3SXNpOu5JF/kR2I6EV8F133wv8AiVeeAteEc5kn0a5cfabcc7D/AM9EH94dx3H4V5uOwSqLnh8X5n6DwfxfLL5rB4t3pPZ/y/8AA/Lc+xqKrWF/aanpsGoWE6T206CSOVDkMp6EVZr5/Y/cIyUkpRd0wooooGFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABXGfEjx5aeA/CT3zbZb+bMdnbk/ffHU/7I6n8u9dTqOoWmlaVcajfzLDbW8ZllkboqgZJr4t8feM7zxx4zuNXnLJbD93aQE/6qIHgfU9T7n2rtwWG9vPXZHyPF/ESyjC8tJ/vZ6R8u7+XTzMHUdRvNW1W41LULh7i6uHMksrnJZjVWiivpErKyP59nOU5OUndsK3vCXhLWPGfiOLR9Gg3O3zSzP8AchTuzH+nU1W8OeHdU8U+I7bRNIg825nPU/djXu7HsBX2R4G8EaV4G8MR6Xp675mw9zdMMNO/qfb0HYVxY3FqgrL4j67hPheecVfaVdKMd338l+vYZ4G8B6L4F0AWOmxeZcSAG4u5APMmb39B6DtXVUUV87KTk+aT1P3vDYalhqcaNGPLFbJBRRRUm4UUUUAFB6UUHpQB+cfxT/5Lh4u/7C1x/wCjDXI113xT/wCS4eLv+wtcf+jDXI19LT+Beh+F43/eKnq/zPoz9j//AJKB4l/7B8f/AKMq9+0H/wAllk/68Yf/AGaqP7H/APyUDxL/ANg+P/0ZV79oP/kssn/XjD/7NXNR/wB8foevnX/JLw/x/qzyuiiivWPyo9z/AGaP+Rm1/wD69Yv/AENq+ke1fN37NH/Iza//ANesX/obV9I9q+bzH+O/l+R/QXAf/Ilpesv/AEphRRRXCfYBRRRQAUySOOWNo5EV1YFWVhkEehFPooDc+a/i58GzpCzeJ/ClsWsRl7qxQZMHq6DunqO306eH1+gTKGGGGR6Gvmf4z/CgaDNL4r8O22NMkbN1bIOLZifvKP7hP5H26e1gMdf93U+TPyHjPg5UlLMMDH3d5RXTzXl3XTfY8VoFB60V7B+VnsPwS+JbeHdWTwvrNxjSrt/3Ejni2lP8lY9fQ89zX1EDmvz8r6o+B/xDPibw6fD2qz7tV09BtZzzPD0De5HQ/ge9eLmWFt+9h8z9c4A4lcrZZiX/AIH/AO2/5fd2PXKKKK8c/VgooooAKKKKACiiigAooooAKKKKACiiigAoorE8XeIrXwp4Mv8AXrvBS2iLKhP33PCr+JIFOMXJ2RnWqwowlUqOySu/RHin7QnjkvNH4I06b5VxNfsp6nqkf/sx/wCA14DVrUdQu9V1e51O+lMtzcytLK57sTk1Vr6rD0FRpqCP5qz7N55rjZ4mez0S7JbL/PzCnwwy3FxHBBG0ksjBERRksxOAAPrTK94+APw/F3dnxvqkP7mFjHYI4+844aT8Og98+lPEVlRg5snJMpqZri44an13fZdX/XU9J+E/w7h8DeGBJdoj6xeKHupRzsHURKfQd/U/hXodA4FFfLVKkqknKW7P6QwOCpYKhHD0FaMV/XzCiiioOsKKKKACiiigAoPSig9KAPzj+Kf/ACXDxd/2Frj/ANGGuRrrvin/AMlw8Xf9ha4/9GGuRr6Wn8C9D8Lxv+8VPV/mfRn7H/8AyUDxL/2D4/8A0ZV79oP/AJLLJ/14w/8As1Uf2P8A/koHiX/sHx/+jKvftB/8llk/68Yf/Zq5qP8Avj9D186/5JeH+P8AVnldFFFesflR7n+zR/yM2v8A/XrF/wChtX0jXzd+zR/yM2v/APXrF/6G1fSNfN5j/Hfy/I/oLgP/AJEtL1l/6UwooorhPsAooooAKKKKACorm2hu7WS2uYklhkUo8bjIZSMEEelS0UCaTVmfHfxX+HkngXxWTaK76PeEvaSHnyz3jJ9R29R+Nef19yeMvClh4x8IXeiXygCVd0UuMmKQfdcfQ/mMivijV9KvdE1270jUYjFd2shikT3Hcex6j2NfRYDFe2jyy3R+Cca8OrK8T7aiv3U9vJ9V+q/4BSrW8Na/feF/FNnrunNie2k3bc8OvRlPsRkVk0V3yipKzPjaNadGpGrTdpJ3T80fePh/W7HxF4bs9a0599vdRCRfVfVT7g5B+ladfOn7O3jIwahc+DL2X93Nm5s9x6OB86D6j5vwNfRY5FfK4mi6NRwP6U4fzaOa4GGJW70a7Nb/AOfoFFFFYHtBRRRQAUUUUAFFFFABRRRQAUUUUAFfOf7Rnisz6lY+ELaX5IALu6APVzkIp+gyfxFfQt5dQ2VjNeXD7IYY2kkY9lAyT+Qr4X8S63P4k8XajrtwTvu52lAP8K5+VfwXA/CvSyyjz1Od9D8/8Q81eFwKwsH71R/+Srf79F95lUUUV9AfhpteE/Dl14s8YWOg2gIa5kw8gH+rQcsx+gzX27pOmWejaLa6Vp8QitbaJYokHZQMV4x+zr4SFrod54vuosS3bG2tSR0jU/Mw+rDH/Aa90r57Ma/tKnKtkfu3AOTLBYH61Ne/U19I9Pv3+4KKKK84+8CiiigAor5+8W/tSad4V8c6t4bk8H3ly+n3L2xmW7RQ5XjIG04rF/4bC0v/AKEW+/8AA1P/AIiuhYSq1dRPFnxDl9OThKrqtNn/AJH03RXzJ/w2Fpf/AEIt9/4Gp/8AEUf8NhaX/wBCLff+Bqf/ABFP6nW/lJ/1ly3/AJ+/g/8AI+m6D0r5k/4bC0v/AKEW+/8AA1P/AIivQPhR8cbT4qeIb/Srbw7caYbO3FwZJbhZA4LBcYCjHWpnhqkFzSWhth89wOIqKlSqXk9lZ/5Hx98U/wDkuHi7/sLXH/ow1yNdd8U/+S4eLv8AsLXH/ow1yNe9T+Beh+Q43/eKnq/zPoz9j/8A5KB4l/7B8f8A6Mq9+0H/AMllk/68Yf8A2aqP7H//ACUDxL/2D4//AEZV79oP/kssn/XjD/7NXNR/3x+h6+df8kvD/H+rPK6KKK9Y/Kj3P9mj/kZ9f/69Yv8A0M19I18cfDD4iQ/DzVNRvJdKe/8AtcSRBUlEe3aSc8g5616X/wANM2f/AEKNx/4Fr/8AE14eNwlWpWcox0P2ThHibLMDldPD4iryyV7qz6tvoj3yivBR+0zY458JXQ+l2v8A8TR/w0xYf9Cndf8AgUv/AMTXJ9Rr/wAp9L/rpkv/AD/X3S/yPeqK8F/4aYsP+hTuv/Apf/iaVf2mNO3jf4UvAueSLpScf980fUa/8o/9dMl/6CF90v8AI95ornPB/jTRPG+h/wBp6LM5VW2SwyjbJE3XDD+o4NdHXLKLi7Pc+joV6eIpqrSknF7NBRRRSNQrwT9ofwUstnB41sIP3kWLe9Cj7yH7jn6E7T7Eele91S1bTLTWdDu9KvoxJbXMTQyL6hhitsPWdKopo8nPMrhmmCqYWfVaPs1s/wCuh8EUVp+ItFuvDnim/wBDvAfOs5miJx94Do34jB/Gsyvq4tSV0fzPVpSpTlTmrNOz9UXtH1S70TX7PV7F9txaTLNGfUg9PoeR+Nfcuhava674bsdYsmDQXcKzJ7ZHT6g8fhXwZX0x+zp4kN74RvfDdxJmXT5fNhBP/LKTJx+DA/8AfQrzM0o80FUXQ/RPDjNPY4uWCm9KiuvVf5r8j2yiiivBP2oKKKKACiiigAooooAKKKKACiig9KAPNvjlrx0X4RXkMUm2fUHWzTB5w3L/APjoI/GvkSvc/wBpPWfO8Q6NoSP8tvA104/2nO0fop/OvDK+jy2nyUU+5+BcfY76zmsqaelNKP6v8WFWdPsbjU9WtdOtF3T3Mqwxr6sxwP51Wr1D4C6ENX+LUN5Im6HTYWujnpv+6v6sT+FdVap7ODn2PmspwLx2MpYZfaaXy6/gfUWg6Tb6D4bsdGtFxDaQJCvvgYJ/E5P41pUUV8m3d3Z/T9OnGnFQirJaBRRRSLCiiigD5Y8c/sx+MfFPxK1zxFZa9okNvqF49xHHMZd6qxzg4UjNc/8A8MieOv8AoY/D/wD31N/8RXF/Fbxj4us/jf4qtLPxVrdvbxalKkcMN9KiIoPAChsAVx//AAnXjf8A6HLxD/4MZv8A4qvbpwr8qtJfcflWLxOVKvNToSbu7+95nsn/AAyJ46/6GPw//wB9Tf8AxFH/AAyJ46/6GPw//wB9Tf8AxFeN/wDCdeN/+hy8Q/8Agxm/+Ko/4Trxv/0OXiH/AMGM3/xVV7PEfzL7jn+tZR/z4l/4Eeyf8MieOv8AoY/D/wD31N/8RXqXwO+CfiL4XeK9T1TWdV0y7iu7QW6LaF9ykOGydyjjAr5J/wCE68b/APQ5eIP/AAYzf/FV75+yp4h8Qa18QNeh1jXdT1CKPT1dEu7p5lU+YBkBicGsMTCsqb5pK3oepkuIy2WNpqjRkpX0blfoeJfFP/kuHi7/ALC1x/6MNcjXXfFP/kuHi7/sLXH/AKMNcjXfT+Beh8pjf94qer/M+jP2P/8AkoHiX/sHx/8Aoyr37QX/ACWWT/ryh/8AZqo/sf8A/JQPEv8A2D4//Rlep/FDxj8P9G8eHT/EvgVdZvVt0f7UQn3TnC888c/nXFGbhi20r6H0eLw1PE8OQp1aqprm3d7bvTS58zUV7L/wsb4P/wDRKE/KOj/hY3wf/wCiUJ+Udd/1mf8Az7f4Hwn9h4L/AKDofdP/AORPGqK9Z1W08D+PvCmtap4Q8NzaBf6LbrdyJuBiuIskMNoPDADOa8mPWtqVX2ielmjysxy54OUbTU4yV1JXs9bPez0Z6h4B+DV1478Jf27Br8NkvnPD5T25c/LjnIYetdLL+zRqqwO0Piu0eQDKq1sygn0zuOK7f9nn/kj/AP2/Tf8AstesV4uIx1aFWUU9Ez9dyTg3KcVl9GvVpXlKKbfNLdr1PgG7tprK+ms7hdk0MjRSL6MpwR+YqGtnxd/yP+uf9hC4/wDRjVjV7sXeKZ+L4mmqdWcFsm1+J75+zMW+3eI1ycbIDj8Xr6Ir53/Zm/5CHiP/AK5wfzevoivm8w/jy/rofv3A3/Ilo/8Ab3/pTCiiiuM+uCiiigD5t/aO8NC11/TvFEEeEu0NrOw/vpypP1XI/wCA14bX2T8YNCGvfCHVoVj3zWqC8i9d0fJx9V3D8a+Nq+iy2rz0uV9D8F4/y5YXM3VitKi5vns/8/mFeg/BbXjoXxf03e+2C+3WUvP9/wC7/wCPBfzrz6pbW5ls76G8gYrLDIsqEdipyP5V2VYe0g4vqfKZbjJYPFU8TH7LTPv4HNLVLSL+PVNCs9ShOY7mBJl+jKD/AFq7XyLVtD+o4SU4qS2YUUUUFBRRRQAUUUUAFFFFABQelFB6HNAHxt8ZNSOp/GnWnDZS3dbVfYIoB/XNcJWn4jvDqHjDVb8nPn3k0mfYuSKzK+uox5YRj5H8uZpiHiMZWrP7Um/xCvpL9mzShB4V1fWmX5rm6WBTj+FFyf1c/lXzaOtfYvwW08WHwT0UFdrTq9w3vvckfpiuLM58tG3dn1vh3hfa5p7R/Yi383Zfqd/RRRXzx+7BRRRQAUUUUAfN/jHx9+ztp/j/AFix8SeBmvNXhunS8uP7NR/MkB5O4uM/WsT/AIWV+y3/ANE6f/wVR/8AxdYPxF+AXxQ8QfFnxFrmlaJbTWV7fSTwSNexIWQngkE5Fcx/wzV8X/8AoX7T/wAGEP8A8VXqwhR5Vef4n53icTmarTUMKmruz5PM9F/4WV+y3/0Tp/8AwVR//F0f8LK/Zb/6J0//AIKo/wD4uvOv+Gavi/8A9C/af+DCH/4qj/hmr4v/APQv2n/gwh/+KqvZ0P5/xMPrWa/9Ai/8Fnov/Cyv2XP+idN/4Ko//i69G+D3ir4QeIPEuoW/w48MNpF7FbB7mQ2awb49wAGQxzzg4r50/wCGavi//wBC/af+DCH/AOKr2T9nb4U+OPh9401fUPFOlw2tvc2SwxNHcxy5feDjCk44FZV4UlTbjO79T0MqxGYSxcFWw6jHq+S1tO583/FP/kuHi7/sLXH/AKMNcjXXfFP/AJLh4u/7C1x/6MNcjXp0/gXofDY3/eKnq/zPoz9j/wD5KB4l/wCwfH/6Mq9+0F/yWWT/AK8of/Zqo/sf/wDJQPEv/YPj/wDRlXv2g/8Akssn/XjD/wCzVzUf98foevnX/JLw/wAf6s8rooor1j8qPT/hV/yJ/wAQv+wI38nrzAdK9P8AhV/yJ/xC/wCwI38nry8dBXPS/iz+X5HvZn/yL8H6T/8AS2fVv7PH/JH/APt/m/ktesV5P+zzx8H/APt/m/8AZa9YzXzuL/jS9T944Z/5FWG/wR/I+FfF3/I/65/2ELj/ANGNWLWx4sYN491tlIIN/OQR3/eNWPX09P4Ufzljf94qf4n+Z75+zN/yEPEf/XOD+b19EV87/szf8hDxH/1zg/m9fRFfOZh/vEv66H73wN/yJaP/AG9/6UwoopCwAyTgDrXGfXC0Vyup/EfwVpmoDTpfENrcX56WVjm6nP8A2ziDN+YqjP8AFDQLU/6aRpy+upTxQNj/AK57jIPxUVapyeyOWpjcPT1nNL5nZ3EEdzbSQSqGSRSjA9wRg18Hazp76T4iv9LkBDWlzJAf+AsR/SvsvTPiT4F1a4W2svFOmvO3AjMuwk+g3AZr5i+MliLD41a0qjCzulyP+BoCf1zXqZZzQnKEla6PzfxFVHFYOliaMlLlla6ae68vQ4OgdaKB1r2z8fPsX4LakdS+Cujszbnt1e2b22MQP0xXf14t+zdfGXwBqdiW/wBRf7gPQOi/1U17TXyuKjy1pLzP6X4bxH1jK8PUf8qX3afoFFFFc57YUUUUAFFFFABRRRQAVV1Gb7Po93PnHlwu+fopNWqyPFUnleBdalGfksJ249o2px1aM6ztTk12Z8JsxY7j1PJpKBjYuPSivsEfylJ3YdOa+5vBNsLP4b6DagY8uwgH47BXwyeVI9q+9dEQR+GtPjHRbaIf+OCvJzZ+7FH6l4YQTq4iflH83/kX6KKK8Q/XwooooAKKKKAPib4l/Gf4n6J8YPEmkaX4tubaytb+SGCFYYiEQHgZKk/nXK/8L7+L3/Q7Xf8A34h/+Ir6y1v9n34Y+IfEl7ruqaTdyXt7M087peSIGY9SADgVQ/4Zk+EX/QFvf/A+X/4qvSjiaCik4/gfB4jI84nVlKFeybdveltf0Plz/hffxe/6Ha7/AO/EP/xFH/C+/i9/0O13/wB+If8A4ivqP/hmT4Rf9AW9/wDA+X/4qj/hmT4Rf9AW9/8AA+X/AOKqvrWH/k/Ax/sDOv8An/8A+TS/yPlz/hffxe/6Ha7/AO/EP/xFe1/s1/Efxt428b6zZeKdfn1GC3sVlijkjRQreYBn5VHau4/4Zk+EX/QFvf8AwPl/+Krp/BPwk8E/DzVbnUfC9jcW1xcxCGUy3DygqDuxhicc1nWxFGUHGMdfQ7ssyfNKGJhUr1rwW65m/wAGfDnxT/5Lh4u/7C1x/wCjDXI19v8AjX4TfAu01i61/wAYqbW71CZ7h2e/lUyuxyxVFPTJ7CuR/wCEL/ZV/wCft/8AwKu666WKTirRb+R85j8icK8/aV6cW23Zys9fKxzX7H//ACUDxL/2D4//AEZV79oP/kssn/XjD/7NXovgrWPgD8O2un8LanDayXeBNK4nldgvQZYHA56CvJvjJ4h0fxP8TX1XQ71bu0NrFGJVVlG4bsjBAPejDc0sS5uLSt1MeI50KOQRwka0ZzUk/dkn3PP6KKK9c/Kj1D4U/wDIn/EL/sCN/J68vHSvaf2e9OtdYvfFOlXyF7a6sEhlVWKkqzMCMjpXp4+Avw3x/wAgu7/8DJP8a8yeLhQrTUutvyP0LC8L4vOcswtTDOKUVJO7a+0/JnzXofj/AMY+GtM/s7QtdnsrXeZPKRUI3HqeQfStGT4u/EiWFon8V3e1hg7UjU/gQuRX0J/woX4b/wDQLu//AAMk/wAaP+FC/Df/AKBd3/4GSf41m8dhm7uH4I7qfB3EVOCpwxNorSynK35HyOzFmLMSxJySTkmkr65/4UL8Nv8AoF3f/gXJ/jUkHwM+G1tcrN/YssxU52TXMjKfqM81p/alLszgXhvmjfvTh97/APkTi/2a9KvYbDW9ZkiZLS4aOCF2GN5TcWI9QNwH1r2/U9U07R9Ml1HVb63srSEbpJ7iQIiD3JrzL4k/GTwh8J9KXRrGCG71ZYwINJtCEWEdjIRwi+3U+nevmq7uPG3xiuH8VeO9ebTPDFvIVVwpEW7/AJ5WsOf3kn+0en8R7V58qcsTN1ZaJn3mHxlDIMHDL6T9pOCd+iXVtvotf8z23xJ+0tFe6wfDvwr8O3HiXUmyFuZEZIFx1YLwzAdydo968z8QeI9b1Z3PxA8ZXeuT99D0Sf7NYRH+7JKn+sx6Ln/frDudatbPSX0LwrYf2Ro7cSKG3XF5j+KeTq3+6MKOw71iV6VDAxjq1/n/AF6HwGc8Z4is3ClK/ntH5Lr6yv6Gw/iTUYrFtP0oQaNYHraaXH9nRv8AeI+Zz7sTWRnnPf1pKfHFJNKkUSNJI52qiAksfQAda74wjFaI+JrYmtiZXqScn/Www8jnpXR+LNJ1vTI9Fk16eWS4u9PWaNZiS0UW9ginPPQA+2cdq9X+FnwRujeQeIvGdt5UaESQabIMsx6hpR2H+z+fpVD9pONV8b6KwAybFh+Uh/xrjWLjOuqcD6mfDWIwmT1cdirxbcbR+e7X5fM8UoooruPjj6A/ZmnO7xHa54/cS/8AoYr6Er5r/Zplx4s16HPWzjfH0cj+tfSlfNZgv38v66H9C8DScslo3/vf+lMKKKK4j60KKKKACiiigAooooAKxfGCGT4e68i9W064A/79NW1VTVbf7XoV7a4z5sDx4+qkU1oyKivBryPgOB/MtIpB/Ein8xT6qaUS2h2u77ypsP1U7f6Vbr7CLurn8rYiHs6kodmIfun6V93afeND4Isr2O2mumFnG4hgALv8g4XJAz9TXwl14r7i8BXQvvhd4fuc536fDn6hAD/KvJzZe7Fn6X4Yz/fYiHVpP7m/8zxrx5+0J418NSSJafCfVbGJTgXesKwQ++IwV/8AH68lvf2pfipdSFra40ezXP3YbMNj8XY19vsiupVlDKeCDyDXDeKPg58N/Fod9V8K2S3Ddbq0X7PLn13JjP45rgpVqUfigfd5hleZVW5UMU/S1vxX+R8ow/tOfFuKQM+q6dMP7slimD+WK6nRv2uvFVu6Lr3hjS7+Mfea0ke3f9dwrV8X/sjTxrJdeB/EPnYyRZaoNpPsJVGPzX8a+f8AxR4I8WeC777L4n0K705icJJIuYpP92QZVvwNd0I4aqvdSPksTWzvLnerKVu/xL9T7I8I/tK/DbxK8dtfXk+g3j8CPUlCxk+0q5X88V69BcQXNslxbTRzRSDckkbBlYeoI61+XXbFdn4F+KfjX4eXgfw9qr/ZCcyafcZkt5P+A/wn3XBrKrl63ps9HL+M5pqOLjdd1/kfovRXk/wu+PPhb4iiPTZyNI13bzYTvkSn1if+L6cH2PWvWM15k4Sg7SR91hsVSxVNVaMrphRRRUnQFIelLQelDA+K/ilql5qnxd12S7lZ/IuntolJ4SNDtAHp0z9Sa4/NdJ8Qf+SseJP+wlP/AOhmubr66ikqcUuyP5dzWcp42tKTu+aX5svaTo+qa7qkem6PYzXt3JysUK5OB1PsPc1Jrmgav4b1U6Zrlk9ndhBIYnIJ2noeCR2Net/s1ojeNtacqCy2SgH0zIM/yFY37QX/ACWWT/ryh/8AZqwWIbxDo20sezPIaUMjjmjk+dytbpbVffoeV0UUV1nyx7n+zR/yM2v/APXrF/6G1fSNfN37NH/Iza//ANesX/obV9I9q+bzH+O/l+R/QXAf/Ilpesv/AEphRRSE4rhPsAJA6188/HD9oKPww9x4S8FTpNrQyl1fDDJZeqr2aT9F9zwF/aC+OB8L28vgrwndga3MmLy7jP8Ax5IR91f+mhH/AHyOepFeA+AfBljc2D+OfGaSHQYJStvaliJNVuBz5anrsB5d/wAOtehhsMre0qfJdz4zPs+cZSwmFlZr4pdIrr/XyWpL4T8GQ3tgfH/xCluX0ueRntrVpD9p1iXPOGPKx5+9J+A5rR13X73X72OW4WKC3gTyrWyt12Q20Y6JGo4A/U9TVu6uPEXj7xciw2r3d3KBFb2dqmEgjHCoi9ERR+HrXt/gf9nywtEjv/GkgvbjhhYwtiFP95hy/wBBgfWvTlUp4f3qm/Y/OKWDxufTeHy+LVFPWT0u+8n+UVe3rqeA6ToGt6/c/Z9F0q8v5M4IgiLAfU9B+Nd3p/wF+Il6FaaysrFW6/abkZH4Jur6usdOsdMsks9Ps4LW3QYWKFAij8BVnArgqZrUb9xWPscF4a4KnFPFVJSflov1f4nz7o37NJ3rJ4g8S5XvDYxYz/wNv8K9X8L/AA58I+EAH0bSY1uAMG6mPmSn/gR6fhiurorjq4qrV+KR9bl3DeW5e+bD0Upd3q/vd7fIMCvmX9pSQHx3o8XdbAt+ch/wr6ar5T/aHuxP8XEtwc/Z7CJCPQks39RW+Wq9dfM8XxBmo5PJd5RX43/Q8noHWigda+jPwM9r/ZoyfHniD0TT4f1kb/4mvpmvm79l+Ev4g8ZXZHCLZ24P4SMf519I18zj3evI/orgyl7PJ6K9fzYUUUVxn1AUUUUAFFFFABRRRQAUHGOaKQ9KAPz8ktG0/wAQ+INHYYaw1W4hx/sl2x/6CaK6L4m6edG/ak8TabjEep4uIvdnRZBj6sGX8a52vqsNPmgmfzXxHhPq2NmvN/gwHWvr74Hait/8FNLTOWtWltm9trkj9CK+Qa+if2atXDaZregu3zRypdoPZhtb9VX8658zhzUb9j3PD3F+xzVU3tOLX6/oe90UUV86fvAVV1DTdP1XT5LDU7K3vLWUYeC4jDow9weKtUUCaTVmfOXxD/ZW0XVFl1LwDdDSLvlv7PnJe2c+ity0f6j2FfLfibwp4h8Ha2+k+JNKuNPul6LKPlkH95GHDD3Br9Maw/FHhDw94z0KTR/EmmQ31q/IDjDRn+8jDlW9xXdQxs4aS1R8pmvCmHxKc8P7k/wfy6fL7j800kkilSWJ2jkQhldCQVI6EEdDX1H8Fv2j3kktvCnxEuxubEdrrMh+92CTn19H/P1rgviz+z3r3gPzta0Azax4eBLM4XM9qP8Apoo+8v8Atj8QK8X6j1FejKNPEwPiqVbG5HibNWfVdGv66n6kqysoZSCCMgjvS18ifAL48SaRNa+B/Gl4W05iIrDUJm5tieBHIT/B2B/h6dOn10rBhkcj1rxa1GVKXLI/UMszOjmFFVaXzXVMWg9KKD0rF7Honw/8Qf8AkrHiT/sJT/8AoZrm66T4g/8AJWPEn/YSn/8AQzXN19hS+CPoj+W8y/3yt/il+bPb/wBmr/kc9b/68k/9GViftB/8llk/68Yf/Zq2/wBmr/kctb/68k/9GViftBf8llk/68Yf/Zq8+H++v0PuMR/ySFP/AB/rI8rooor0z85Pc/2aP+Rm1/8A69Yv/Q2r6Rr5u/Zo/wCRm1//AK9Yv/Q2r6Rr5vMf47+X5H9BcB/8iWl6y/8ASmFeW/G/4rQfDXwSRZPHJr1+GjsYjzs/vSsP7q549Tgetega/rmneG/DV7rurTiCys4Wmlc+gHQepPQD1Ir8/fEuveI/jB8Xmu0iaS91GYW9na7vlt4gflXPYKMsx/3jUYWh7SV5bI7uIc2eCpKlR/iT0Xl5/wCQngrwvN438SXuseIb6eLR7M/a9X1Fzl23HhFJ6yyHgD6ntXqel6Fr3xY8VxWWi2Sadotggt4EAPkWEA6KP7znqe7Hk8VpeFvAjeK5LbwN4XmaLwtpMm+/1ULj7bckfPKPU/woP4VGT1r6c8P+HtK8MaFBpGj2q29rEOFHVj3Zj3J7k121sUqW3xdPJf5nxmV8PzzV8tR2oJ+8+tSS6J/yrv1eq6Wy/BngLQPA+jiz0m2zMwHn3cmDLMfc9h6AcCunAxS0V5MpOTvJ6n6fh8PSw1NUqMVGK2SCiiipNgooooAK+MPi5qH9pfGfXplbcsU4t1I/6ZqFP6g19jX95Hp+l3N9MQIreJpXJ7BQSf5V8G397JqOq3WoTZ8y5meZs+rMSf5162VQvOUj8x8TcUo4ajh1u239yt+pWp8Sb5lToCcE+lMqLUJ/sfh2+vMkER+Sh/25Pl/9B3n8K9qTsrn5FhqPtqsYH0X+ynbGT4feINbK4+3au23/AHUjXH/oRr36vLP2dtIOkfs7aCGXD3YkvG/4HISv/ju2vU6+VxEuapJ+Z/S+S0fY4GjD+6vx1CiiisT1AooooAKKKKACiiigAooooA+Rv2stJn0r4i+HPFloNjT25h3gdJIX3KT+D/pXn175MkkV7ajFteRrcwgdlbqv/AW3L/wGvpL9p/w2db+Bk+oxR7p9IuEvAR12fcf9Gz/wGvl3wfc/2t4Su9HJ3XWmZvbcd2gYgSqP91tr/Qua93AVf3a8tD8d42y2+Jqcq1a5l+TX4X+4mr0P4Ka8NC+L1gJX2wXwaykz0y3K/wDjwX8688qSCaW3uo7iByksbh0YfwsDkH8xXo1aaqQcH1Pz3LcZLBYqniY7xaZ9/g5FLWH4O8QQ+KPA+m67CR/pMKs6j+Fxw6/gwNblfJNOLsz+oKNWNanGrB3UkmvRhRRRSNAooooARlDqVYAg8EEda+ZPjT+zjFdi48VfDyzWK55kutHjGFl7loR2b/Y6Htg8H6cpCAa1pVZUpc0ThzDLqGOpOlWXo+q9D8t5I3jkaKVGR1JVkYYII4II7Gvq/wDZw+NLX62/w78VXebpF26XeStzKoH+pYn+ID7p7jjqBna+O/wGi8WQT+LvCFqkWvope5tEG1b4DuPSX3/i6HnmvjpWubK+DKZba5gkyCMo8TqfzBBH4EV614Yunbr+R+bOGK4exilvF/dJf5/kfqKOlIeleUfAr4rx/EfwV9n1GVF8Qacqx3idPOXosyj0Pf0P1FesdRXjTg4ScZH6fhcTTxVKNak7pnxF8RoZYPi34jSVSrG/lfB9GbIP5EGuYr68+Ifwf0bx3eLqaXL6bqgUIbiNA6yqOgdeMkdiCD9a88/4Zm1D/obbX/wEb/4qvfoZhR5EpOzPxPOOB80+uVJUIc8JNtO6W7vrdrU8q8E+NNV8C+JDq+lrFKXjMU0EudsqE5wccg5AINL458Y3HjnxY2u3VlFaSGFIfKiYsuFzzk/WvUz+zNqX8Pi20/G0b/4qm/8ADM2q/wDQ2Wf/AICt/wDFU/rWF5/aX1+Zj/q3xH9V+pezfs73teO/3nhNFe7/APDM2qf9DZZ/+Arf/FUf8Mzap/0Nln/4Ct/8VWn1+h/N+Zw/6k51/wA+Pxj/AJkf7NH/ACM2v/8AXrF/6G1fSBOBmvMfhb8Krv4earqN3c6zDfi7iSMLHCU27WJzyTnrXXeOfFdn4K+H2qeJr3BSyhLpGTjzJDwiD6sQK8TGTVWs3DW9j9g4WwlXLMphSxa5ZR5m/JXb6eR82/tVfEZrvVIPh1pdx+4tytzqRQ/ekxmOI/QfMR6lfSsf4NfDjUrvTR9mVrfU9ZhzNdledO05jgkf9NJsEAf3Bno1cR8NfCOqfF/4zt/aTtPHJK2o6pO2cFd2Sue25iFHoCfSvuzQNBs9B0029si+ZI3mTSBcF2wB+AAAUDsABXRVqLDwVOO542BwNTO8TPG1tIXsvTsvyv621HeH/D+l+GdAt9H0i2WC1gXAUdWPdmPcnua1KKK81tt3Z99TpxpxUIKyWiQUUUUiwooooAKKKDwKAPN/jhrw0T4RX0KPtn1ArZxgdcNy/wD46G/OvkOvY/2hfE41Px3b+H4Jd0OmRZkAP/LZ8Ej8F2j8TXjlfR5dS5KKb66n4Bx3mKxmaShF+7TXL8+v46fIByazPF3mu2l+G7YE3Em24kQdfMlwIl/BMH/toa6LSba3mu5Lq/JXT7OJru7YHH7tOqj3Y7UHuwpvwc0258fftK6Zd3yK4W6fVLkAfKqx/Mq/QNsUe1a4ipyr01OTh7L3WmpW1k1Ffq/0+8+5PDukx6F4S0zRYQAllaxW4x/sIF/pWnSDgUtfLt31P6IjFRiorZBRRRQUFFFFABRRRQAUUUUAFFFFAFHWtLttc8PX2jXqBra9ge3lH+y6lT/OvzkifVPh78S3VkBvdIvHglif7soUlHQ/7LrkfRq/SmvjL9qrwYdG+JNr4stYsWusxbZiBwLiMAH/AL6TafwNd+AmlJwfU+P4vwjlQhiobwf4P/g2Oe17TrazvIbzTHaXSdQiF3YSnkmJv4T/ALSEFGHqtZNWfhnqMPiDSpfhzqMyxzTSNc6JPIcCO5I+aAnssoAx6OB61FPBLbXMlvPG8UsbFHRxgqwOCCPWvdozuuV7o/Fc3wKozVamvcnt5Pqvl08rHvH7Oni4RT3vg27lwr5u7Tce4GJFH4Yb8DX0RXwTo2rXmha/aaxp8my5tZRLGfUjsfYjIP1r7e8L+IbLxT4UstdsGBhuYw23ujdGU+4ORXjZlQ5J+0Wz/M/V/D3OlisI8FUfv09vOP8AwHp6WNiiiivMP0MKKKKACiiigBCMivm39on4JDVra48f+E7P/iYxKZNRs4l/4+UA5lUf3wOo/iHuOfpOkIB61pSqypy5onFmGApY6i6NVaP8H3PzZ8C+MtU8BeOrHxNpTZeBsSw5ws8R+9GfYj8iAe1fol4a8Q6Z4q8KWHiDR5xNZ3kQljbuM9VPoQcgj1Br5F/aN+EI8Ja43jPw9bbdEv5cXMMY4tJ29B2Ru3oeO4q3+y98SzonihvAOrXGLDUnMlizHiK4xyn0cD/voD1r0MTBV6aqw3R8VkeJq5TjZZfifhk9H59H6P8AM+xKKQHIzS15Z+hBRRRQAUUUUAFfKP7WvjXzb/TPAdnL8kIF/ehT1Y5ESn6Dc34rX1Rd3UNlZTXdzIscMKNJI7dFVRkn8hXxF4E0qf42/tRXOtajEz6d9pbUrpW5AgQgRRH64RfpurrwkVzOpLaJ81xLWnKlDB0viqu3y6n0N+zz8Pv+EI+FMN5ewbNX1jbd3W4fNGhH7uP8FOT7sa9dpFAC4AwPQUtc05ucnJnu4TDQwtGNGntFWCiiipOgKKKKACiiigArH8Ua/a+GPCV/rl6R5VrEX2/326Ko9ycD8a2CcCvmz9oPxuL/AFeLwbp8uYLRhNeFTw0uPlT/AICDk+59q6MNRdaoonh8RZvHKsDPEP4to+be3+bPGNS1C51XV7rU7199zdStNK3qzHJqr9aK6TQYLLR9FvPHWuwLJpumsEtraTpfXZ5jhHqo+8/+yPevppyVONz+dsJhqmOxHInq9W+y3bZz3jy6/wCEf8LWvhJPl1G92X+qesaYzBAffB8xh6snpXs37I3hQw6PrXjS4jIa5kFhbMR/AnzSEfVio/4Ca+YLm51bxN4okuZ2e81TUrnJPVpZXboPxOK/RbwD4Vg8FfDjSPDMG0mzt1SRx/HIfmdvxYsa8jHT5afK92frPCWBjVxXtIr3Kasv677t+Z0lFFFeQfpgUUUUAFFFFABRRRQAUUUUAFFFFABXBfGLwMvj/wCEupaLFGGvo1+1WRPaZASB/wACGV/4FXe0HpVRk4tSRlXoxr05Up7NWPy4Vp7a6DKZIJ4nyCMqyMD+hBFe6i5j+KHgaTxbZKn/AAk2mRqmuWiDBuEAwt2g98YcDuM/Wp+0r8PD4T+JB8R6fBt0rW2aX5R8sVwOZF9t33x9W9K8u8I+K9W8FeLrTxDosoW5tzho2+5Mh+9G47qRx+vavfhP2kVUhv8A1ofjOKwkcNVqYHFr3H+HaS/rVXR1Zr1r4HfEAeG/Eh8O6nNs0zUXGx2PEM3QH2DcA++PesHxHoOkeI/Cq/EfwHGTpEzY1DThy+mT/wASkf3MnIPuOx44McV0NQxNNp/8Mz5inLFcPY+NWO61T6Si/wBH+Hqj9Ah0pa8f+CfxMHiTSU8M6zcf8Te0j/dSOebqId/dl7+o59a9fByK+aq0pUpOEj+gsrzKjmWGjiaD0f4Pqn5oWiiisz0AooooAKKKKAM/XNG07xD4evNE1e2W5sruIxTRN0ZT/I9wexr89fiD4K1b4Y/Ey40WSaRTbyC5sLxflMkeco4P94EYPoQa/RqvIv2gvhqPHfw1kvdPtw2taSGubUqPmlTGXi98gZHuB6114Sv7OVnsz5viTKvrmH9rTX7yGq811X+R0Xwj8fRfET4XWGuMyi/QfZ76Nf4JlxuOPRhhh7NXd18Qfs0+PD4V+Ki6DeTbdN13bbkMcBJx/q2/HJT/AIEPSvsjxL4l0fwn4aute128S0sbZdzyN1J7Ko7sTwB3qcTR9nU5V12OjI80jjMEqtR6x0l8uvzWpo3VzBaWUt1cypFDEhkkkc4VVAyST6AV5N8Gvi/p3xC1LX9NknEd5Dfyz2cTnDS2ZPyEDuR3HbIr52+KP7Qnifx9DdaJpif2R4elOw268zXC5/5aP2B/urx2JNeT6dqOoaRqkGpaXez2d5A2+K4gco6H1BFdVLANwfNufP47i6McTD6urwV7+fp6H6gZzRXyf8Lf2odQTUoNF+JDRzW0jBE1iNAjRH/pqo4K/wC0ACO4NfVsU0U8KTQyLJG4DK6nIYHkEHuK4atGVJ2kfWZdmmHzCnz0HtuuqPKf2jfFH/CNfAjUo4pNlzqjLp0WDg4fJc/98K351lfsxeCh4b+Ei69dQ7L/AFxxcEkcrAuREPxGW/4FXJ/tBxT+O/jl4J+GNo5KN/pFzt/gDtgsfpHG5/GvpSztbexsILO1iWKCCNYo0UcKqjAH5CtZPkoqPfU8/D0/rOZ1K72ppRXq9X/kTUUUVyn0AUUUUAFFFFABRRVDWNY0/QtEudW1S5W3tLdC8kjdh6D1J6AU0ruyJnOMIuUnZI5v4l+ObbwN4KmvwUe/mzDZwk/ekx94j+6vU/gO9fGdzcT3d5Ld3UrTTzOZJJGOS7E5JP410nj7xrfeOvF82rXW6O3T93a25PEMeeP+BHqT/hWV4e8Par4o8Q2+jaPbGe5mP/AUXuzHso9a+jweHWHp3lv1PwHirPKme45UsOm4Rdoru+/z6eRZ8KeGbvxTrv2KCRLe2iQz3l5KcR2sK8tIx9h09TXKfEvxlaeJdat9J0BXg8M6Qpt9Ohbgy8/PO/8AtuRn2GBXW/FDxdpPh3QZPhb4JuhPbqwOuarH1vph/wAslP8AzzU/mePXPkFpa3N9fw2VnA89xPIsUUSDLOzHAA9ySKOd1Hzvbp/mdNLBxy+l9WhrUl8TX/pK8l17vySPbf2YPAh8SfE1/E95DnT9DAdCRw9ywOwf8BGW+u2vtcdK4r4V+BYPh58MtP8ADyhGugvn3kq/8tJ25Y/QcKPZRXa14eJq+1qNrY/Xsiy76hhI038T1fq/8tgooornPZCiiigAooooAKKKKACiiigAooooAKKKKAOU+IvgjT/iD8PL/wANXwCNMu+3nIyYJl5Rx+PB9QSK/O7WdH1Dw/4gvNE1a3a3vbOVoZoz2YHt6g9Qe4Ir9PK+dP2mPhM2u6QfH2gWu7UrGPF9DGuTcQD+MDuyfqv0Fd2CxHJLklsz5HirJ/rVL6zSXvx381/wD5w+HPxD1f4deKv7SsVW6sZx5V9p8p/d3UXcHsGGTg9voSK9f8UeC9H1rwwPiF8NZDe6BNl7myXmWwf+JSvXA9O3uOa+cO3Fdj8OviT4g+G3iYano8gltpcLd2Ep/dXKeh9GHZuo9xkV6koyi/aU9/zPz2nOhiKX1TGL3OjW8H3Xl3XX1N6wv7zTNTg1HT7h7e5gcSRSoeVI6Gvrn4X/ABMsvHeiCGcpBrNuo+022cB/+mieqn07H8K8fv8Awf4X+KvhuTxp8K5I4rwfNf6FIQjRueSFH8JPb+Fu2K8vs73WfDHiRLq1kuNP1Kzk7gq8bDqGB/Ig9amrCGMhppJGWXYvG8KYpOouehPqtpLun0a7fJn3kDkUV5v8M/itpvjixWxuzHZ65Gv7y2zhZgOrx56j1HUfTmvSO1eFUpypy5ZLU/asDj6GOoxr4eXNF/1r2YUUUVB1hRRRQAUh5FLRQB8afEf4W6f4U+PV3qt0l1B4blj/ALVhWyYRuZS4HkIxBCkSHdnBwvSsP4+fFK58c69p+i2plg0zT4I5JIGbJe5dAWLY67Qdo993rXuX7Qd19r1Xwt4cB+SaZ7mUf7Iwv8i9fGN7dPfajcXsn355Wlb6sSf617mHj7SMZy3R+SZzXlhcViMJh9Kbav625mvRXWhBRRRXYfOhX1/+yv8AEKfWfDF34H1ScyXOlKJrN3OS1uTgp/wBsY9mA7V8gV6X8AtWk0n9oDQdrlUvWkspMHqsiED/AMeCn8K5sVTU6bPa4fxssJjYNbSdn6M+k/BeiPrf7Wvjvxncpui0pIdKtGI6OYkL4+gGP+B17YOlcX8LltZvAMerwEtPqU0l3duerTZ2N+WwD8K7SvEqu8rdtD9Uy2EVQU4/bbl/4E7/AJBRRRWZ3hRRRQAUUVS1TVbDRtKn1LU7qK1tIV3SSyHAUf57U0r6Imc4wi5SdkiW9vLWwsZby9uI4LeFC8ksjbVRR1JNfJfxX+J1x451j7DpzSRaHbP+5Q8Gdh/y0YfyHYe9P+KPxYvfHF22maaZLXQo2ysR4a4I6O/t6L2789MnwH8Ndc8cXfmwr9i0qM/v9QmHyKB1C5+8f0Hc17WFwscPH21bf+vxPyDiXiOvnVX+y8qTlF7tfa/yj5vf0MTwx4W1nxd4hi0jRbUzTPy7nhIl7sx7D+fauh+IPjfRfhp4dufh18PbsXGsTjy9a16P7wPeGIjp6HH3f97JDviH8WdC8IeH5/h78I5NiH5NR15DmSZsYIjfv6bxwOi+tfPhOTk1u3Ku7y0j27+pwUMLRyeDhSalWekpLaPdR/WXyQV9JfsufDFtR1h/iLq9v/otmzRaarjiSXo0v0XoPcn0rx/4Y/D3UfiT4+t9Bs98VquJb66A4ghB5P8AvHoo9T6A1+hOjaPp2gaBZ6NpNstvZWkSwwxL/CoH8+5Pc1y47EcsfZx3Z9Lwpk7r1frdVe7Hbzf/AAPzLwGBS0UV45+lhRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUjKGQqQCCMEHvS0UAfE37QfwcfwTrr+K/D9qf+EevZMyRoOLKUn7vsjH7voePSvDq/T7VNLsNa0i50vVLSK6s7mMxTQyjKup6g18JfGX4Paj8MvEJuLUS3Xh27kP2S7IyYiefKkP8AeHY/xD3zXsYPFcy5Jbn5pxNkLw8nisOvce67P/L8jh/C/ivXvBviOHXPDuoSWd5HwSvKyL3R16Mp9DX01oXiv4dfHzT49O12OPw74zVNsciEAXBH9wn74/2D8w7HvXyZSqzI6ujMrKQQynBB9Qa6qlFSfMnZ9z57CZg6MHQqxU6T3i9vVdn5o958V+AfF3w81VLu5jlEEb7rfU7QnZkdDnqjex/WvWvhv8d7a8WHRfGsqW9zwkepdI5f+un90+/Q+1eTfDn9pXVdGtV0D4g2z6/o7Dy/tJUPcRr6MDxKv159zXpl78KvAXxF0dvEXww161h3ctbqS0Ib+6y/eiPtj8K56s4zXJiVbzR6GAwdbCVHisgqcyfxUpPX5d/Xf1PoCOVJY1kjZWRhkMpyCPUGn18s6X4j+Jnwau1sNa02a40fOBFMS8OPWKUZ2n2/Svc/BvxO8KeNIUj06+EF8RlrG5ISUH27MPcZrzq2FlT95ax7o+5yriXDY2XsKqdOt1hLR/Lv+Z2dFICDS1zH0YUUUUAfP/xiie5+PXh216+Zp0iJ/vN5oH67a+NFBCKCMHFfbXx+trnStZ8LeNraIv8AYLny5MezB1B+u1x+NfJfj/RI9A+ImpWVtzZSyfa7J+z28vzxkf8AAWA+oNe7hJXpx9PyZ+P59SlDHYhPfmT+Uoq34xaOaooorrPCCux+FBKfGnw5P2gvBcMfRY1Z2P5Ka46u4+HkBtI9Y8ROMCC2axtz6zTgqcfSLzD+I9aiaurdzahUVKaqvaOv3an2D8AbiS5+D0TSEnbeThc+hbd/MmvUa4L4NaRJo3wa0iGZCks6tdMD1/eMWH/ju2u9rwMQ06smu5+w5DCcMuw8am/JH8gooorE9YKKqahqdhpWnyX2pXkNpbRjLyzOEUfia8Q8ZfH1prhtG+H9nJd3LnYt68ZbJ/6Zx9WPufyNa0qE6rtFHlZpnWEyyHNiZ2fRLVv0X9I9R8aePvD3gfSzc6vc5nYHybSIgyyn2HYe54r5b8YeOfFPxM8Qx2xhlaEvi00u1BcA+pA5Zvc/pXX6B8FvGnjDU21vxtfy6ekx3yPcN5lzIP8Ad6IPr09Kva98U/hZ8GrKbR/AdhBrmu4KSzK+9Vb/AKazd/8AcT9K9KiqdB2prnn+CPg8zlmOdR5sXL6thez+KXy3fpt6lbQfhJovhXQj4u+LOpwWFjCA4sDJ949lcjlj/sLk+/avMvip8d9Q8XWbeF/CMDaF4XjHliGICOS5Udnx91P9gfiT0rz7xn478T+PtdOqeJtTe5dc+VAvywwD0ROg+vU9ya5yumNKUnz1nd/gjyJ42hhaTwuXQ5IPdv4per7eSCtDQ9D1TxJ4htND0W0e6v7uQRxRL3PqT2AHJPYCq9hYXup6nBp2nWst1d3DiOGCFdzyMegAr7j+CHwZtfhvof8AaeqLFceJLxAJ5RyLZDz5SH/0Ju59gKMTiFRj5muS5PUzKtZaQW7/AE9To/hT8NNN+GngaLSbYrPfzYlvrwDBmlx2/wBlegH49Sa7yiivAlJyd2fr1ChChTVKmrRWwUUUUjUKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigArO1zQ9L8RaBdaLrNlFeWNyhjlhlGQR/QjqD1BrRooTtqiZRUk4yWjPgv4xfBTV/hpqjahZCW/8NzPiC8xloCekcuOh9G6H2PFeU1+oN9YWepadPYX9rFc2s6GOWCZQyOp6gg9RXyF8Yf2cNQ8ONceI/AkE1/pPMk2nLl5rUdynd0H/AH0PfrXr4XGqXu1Nz85z7hiVBvEYRXj1XVendfkfPdaeg+Itd8L6wmq+HtVutNvF/wCWtu+3cPRh0YexBFZlFeg0mrM+NhOVOXNB2aPp3wX+1VFcWy6T8StES4iYbHvrKMMrD/ppCeD/AMB/Ku9X4efCX4kWh1jwJrcVncZ37tMk4jb/AGoTyh+m2viWrFjf32mX8d9pt7cWdzGcpPbyGN1+jA5rleF5XzUnyv8AA92Ge+3gqWY0lViur0kvRn2/ZwfGnwKBEBa+NNLTovmbLlV9i3JP/fVdFpXxe8MXNwtlrq3nhu/PBt9XiMIz7OflP6V8veE/2nPiN4fCQatJa+IbVeCL1dk2PaRf/Zga9i0b9pz4Y+JbZbLxbpVzpZbhlu4Bdwf99KCfzUVx1aE95w+a/wAj6PL8zoRSWGxLiv5amq+Urpr5yfoe9wXVvdW6z208c0TDKyRsGU/QipAQa8x0Kw+E2vv9p8Ea/bWc7nP/ABJNSMDfjEGx+a11kOk+JbE4tvFIu07LqVmrn/vqMofzBrilBLr959XQxVWSvKCfnFpr8bfqWvFHh2x8VeFrzQtRU+Rcx43DrGw5Vh7g4NfIHjvwHqixp4Q1qNYdb0/d/ZF4x2xX0BOTBvPA5JZM9CWU4yMfYUc/iCMYuLKwm/2oJ2TP4Mv9ap65ommeKdJbTfEPh43MB5AYoSh9VYNlT7itsPiHS0ex5Gd5NHMbVqfu1Erap2a7P56p9H3PzcuLe4tLuW1u4JIJ4mKSRSqVZGHUEHkGoq+hPFl38ObrXp9J1DRdT1u3tnNvHdXDLb3sQU42rMvMijGAJFJ9xXPWnwst9eux/wAIp4K8TzxE/K15cjyx9WEaD/x6vZVR2vJWPzCdOnzuFGfNJO1km3+Caf8AWx5RpumXeq362togz1eRzhI17sx7D/8AUOa98+GHw9bxfq1lpNrFKnhrS333Vyy7TcSHBb/gT4Ax/CoH49j4Q/Z6uIkifxR/o1qCG/s3TcZY/wC3IT+oyfcV7np1mdG0qHTNC8PwWlrCMJG0wRR/3yGJPv1NclfGRStT1f5H0WUcMV8TJVMbFwprXl+1K2ydtl3W7NuOKOGFIokVERQqqBgADoKdkViSx+K7kFUvNKsAf7kL3DD8Syj9KyNR8NWzWzT+KvGWqvbD76tdrYw49/LCnH1Y15Sinuz9InXnFe5D72kv8/wNPXvG/hTw1GTrWuWltJ2h37pG+iLlj+VcVdfEXxn4izB8PvBF40bcDU9XXyIh7qpIJ/P8Kyrv4k/ADwAztYXGlT3i9RpsH2uZj7ycjP1avO/FH7XV1IHg8HeF0hHRbrVJN7fURocfmxrqpUG/hhf12PncfmaWlbEqC7U/el/4E72/8BXqegn4O634juv7W+J/jSa7CfObW0OyKMf7xwFH0X8azdW+LXwX+E1tJYeErK31bU1G0rp2Hyf+mlw2R+AJ+lfL/iz4leOfG0jf8JH4jvLqAnItUbyoB/2zXA/PJrlK7lhpzX72WnZaI+UlnOGwsnLAUfff25+9L8b/AJ/I9M8f/HXx54+8y0nvv7K0puP7PsCUVh6O/wB5/wAcD2rzMDAwOKKK6oU4wVoo8LE4qtiZ+0rScn5hV3SdJ1LXNat9J0iymvb25fZFBCuWY/0HqegrZ8EeAfE3xB8QjSfDdiZmBBmuH+WG3X+87dvp1PYV9vfCz4P+HPhjpB+yKL3WJkAutSlXDN/soP4E9u/fNYYjFRpK27PXybIa2YyUn7tPq/8AIw/gr8D9P+HOnrrGriK98STpiSYcpaqescfv6t36dK9ioorxKk5TlzS3P1XCYSlhKSo0VZIKKKKg6QooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKQjIxS0UAeI/FX9nTw942M2s+HWi0TXmyzMqYt7k/9NFH3T/tL+INfIPizwZ4l8Ea42leJtKmsp+djsMxyj+8jjhh9Pxr9LKyvEHhzQ/FOiyaT4g0u21GzfrFOm4A+oPUH3HNdlDGSp6S1R8vm/DFDG3qUfcn+D9V+p+ZVFfTnxB/ZRuoDLqPw8vxPHy39l3z4ce0cvQ/RsfWvnTW9A1vw3qr6Zr+lXWm3a9YbmMoT7jsR7jIr1qVeFVe6z88x+U4rAytWhp36feZ1FFFbHmgDtcOOGHQjqK6bSPiL480EBdI8Ya1aoOka3TMn/fLEj9K5mipcU90a061Sk705Nejsetaf+0p8XLAKsmu2t8B/wA/dnGxP4qFNdJa/tbeP4gBd6F4fufcJLGf/QzXgNFZPDUn9k9CnnmPp/DWl99/zPoaH9qy+W6N1N8OdBa4blpklZWP1JUmr5/bB1nbhPA1gPrfOf8A2Svmqip+qUuxtHiLMI7VfwX+R9Ez/te+LmB+zeE9FiPYySSv/IisO+/ao+KV1kWw0WxHbybQsR/32xrxKimsLSX2SJ8QZjPes/wX5HoGqfHD4r6uCLnxrqESnqtoEtx/44Aa4q/1TU9VuDPqmo3d9IeS91M0p/NiaqUVrGnGOyPPrYuvW/izb9W2HQcUUUVZzhRRXp3gP4D+P/HTR3MennSNLbn7dqClAw9UT7z/AKD3qJ1IwV5M6cNhK2JnyUYuT8jzEAlgqgkk4AHUmvdfhh+zX4i8VmHV/F4n0PR2wwgIxdXA9lP+rHu3PoO9fQnw6+BHgn4feXex239rawoz/aN6oJQ/9M06J+p969RxXmV8e3pTPusq4QjC1TGu7/lW3zZj+GvC2g+EfD8Oi+HdNhsLOLokY5Y92Y9WY+p5rYoorzm29WfcQhGEVGKskFFFFIoKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACsrXfDeg+JtLbTvEGkWepWzf8s7mIOB7gnkH3FatFCdtUTKMZrlkro+c/F/7JnhzUGe58HaxcaPMeRa3WZ4PoD99fzavDPFHwD+KHhdneXw8+p2y/wDLxpbfaBj1Kj5x/wB819/0hGa66eNqQ31PncbwrgcReUVyPy/yPy6ngntbhre5hkgmU4aOVSrD6g81HX6aaz4W8N+IoDDr2hadqSYx/pVushH0JGRXm2tfs0fCjVmZ4NGutLc/xWF0ygf8Bbcv6V2QzGL+JWPm8RwXiI60ail66f5nwpRX1lqX7H2jSEtpHjTULf0W6tUm/VStczd/sg+Ko2P2HxdpE47edDJGf03VusbRfU8qpwxmMP8Al3f0a/zPnOivd5f2TfiUhIi1Hw9L7i4kX+cdRL+yh8Ty2GuvD6j1+1Of/adV9apfzHN/YOYf8+WeG0V9AW/7I/j2Qj7Rr+gQj/ZaV/8A2QVvWH7Ht2SDqvjqFR3W1sSx/NnH8qTxlFfaNYcN5lPak/m0v1PmGg8dePrX2dpX7Jvw+s2V9U1PWtTI6q0qwofwVc/rXomhfB34ZeHCr6Z4N0wSr0muI/tD/XdJkisZZhTWyuenQ4Nxk/4klH8f6+8+DPD/AII8YeKphH4d8NalqAP/AC0ihPlj6ucKPxNez+FP2TfFeo7J/FmsWmjQHloLb/SJ8emeEX82r7BSKOKIRxoqIowFUYAH0p9ctTMKkvh0PoMJwdhKWtZub+5f18zznwX8Dvh34IaO40/REvb9ORfahieUH1XI2r/wECvRQAO1LRXFKTk7ydz6ihh6WHjyUoqK8goooqTYKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAopNy+opC425oC46ivGtC8ffFK8+KsEeq+DJbbwfe3lxaQS/ZJBcwKgHlyzZPyox7kDv6c+xh1x1q5wcdzmw2KhiE3C6s7aq39IdRTd4zjijevrUHRdDqKQMG6GkLAHBoC46im719RTXlVULE9BnjmgLokorxvwn49+Keo/E23j8Q+DJLLwtqMlzHaSC1dZ7URn921wScKGHqB19q9i3DHNXODg7M58NioYiLlBPR21Vh1FN3rnqKUkDqag6bi0Um4etG4UCuLRSbhnAoJAGTQMWim71x1FJ5i+ooFcfRTd6+opsk8MQBllSME4BZgMmgLokopoYEZo3LjORQFx1FJkAZo3D1H50DIrm7trOMSXVxFAjMFDSuFBJ6DJ71MDkZrx349+C38WeHtOe1s7vU75ZHsbOyRd0CS3AC/aZSPuiIAsG9frXqOiWbaV4a07S5bk3MlpbRwNOx5kKoFLH64zVuKUU7nLTrzlWnTcbJWs+9zRopNw9aTeucZH51B03HUUgYHpRuGcZoHcWimM2VIBrz/AMD694/uPH/iXw/410uFLSyZH03UrW3aOG5jJOeSSCwG3I7HNUo3TZjUrxhKMWn73/D6nodFN3r6ijevqKk1uh1FM8xfUfnTgQRntQO4tFJuX1FJuGMk4oFcdRTfMX+8PzrlfBnxF8MePLbUbjw/cTvHp8/2e4aeIxbXxnjPUe9PldrkSrQjJQb1e3yOsork9f8AiN4X8NeJ9D0HUrmY3etyeVZeREZEdtyryw4HLCuq3r60OLW4Qqwm3GLu1v5DqKbvFM+0Q+d5Pmp5nXZuGfypF3RLRSA5FLQMKD0ooPSgD4i8Y+G9U8cftfeIfCthrD2Ek88rxyOzFFKQB8YBHXbj2zWr8L/EuuX37NHxP0e/1C6uItOs1ktmllLGIuHDKrHkD5AcfX1rF8Y6Z4q1j9sPxHp/gu7NrrUs0vkyiXyjtFuC6huxK5H41pfC3U9L/wCGZPidoSWDQarDZme4nZ93nIQVUY/h2kEY/wBrNexNfu1/26fmeHdsZUequ6uvR6aJea3MP4afBvxl8SfC7+IdK8T21pBDdm2aO6mm3EqFYn5QRj5hWl+0bqmoaP8AtGJc2l3NG9rZ2kqBJCBuXJ6fUVV+DejfGS+tbO88EXV/H4bj1RBeJDeRxISGQyZRiCfkx9a2Pjxop8R/tcW2hIPnvbW3hT/eKPj9cU2/375mrWZn7P8A4S06UJRk5R1ezeuq8jU8T62dY/bb8G39rcSi1vI9OnVA52kOhbp071l/DK6upPix8Vle5nZV0jVSoaQkLiXjHpXF/DjVp9X+PvgA3IbzbOW2sTu9IywH/jpA/Cqq6R4u1f4m+Nl8ITzRSW7X1xfeVc+RutlmO8Hkbh0+XvR7NL3X2/USxsptYiKbvUk7Lzij3n9kCeafwb4laeaSUi9iAMjFsfu/esb9qo3Wm/EnwdrEE80aNGUbY5UExyq3b/frX/Y9OfBvicj/AJ/ov/RdO/a/sS/gvw3qgXmC+khz6b493/tOudaYq39bHttOXD0ZLdJP7pGDo8txrf7f2ruLiZrey8+TYHO0bLYRjjp95hXA/Dy8u2+DPxYdru4ZksbUqTIxK/v26c8V3v7PzDX/ANoLx14mIDL9ll2t7ySjH6Ia88+HX/JF/i1/14Wv/o9q2atePblPL5nJQq3+N1n/AOS/8A0fhh8GPGXj/wAPWvizTvE1rbWsd75ZhuZpt58tgT0BHNS/HrXb/Qf2rLnU7W6nT7E1lcKiuQp2ojYx74qX4JaN8ZLptGv/AAtdX6eEk1RDdxxXiRxkB183KE5Py9eOaPjbokniP9rrUNFiGZLi1TYB3ZbQsv6qKpP981JpqzMpU7ZZCVGEoyco6v7Ts9V5HT6lqhv/APgoBo09rcym0n+zSIoc7WVrPcDjp3Fe7fGdnj+APix42ZWGnSEMpwR0718i/CbWJdb/AGlPBV3OSZYlhtWJ7+VbtGP0UV9T/tBWmo3X7PXiAaddfZzFGs0x3Eb4VYF0465HGK5a8OWpTi/L8z3cpxLrYHF1lrdyf/kp8cQaB4htfhLF8SrPxFcRJHqv9neSkrrLG4QOJAwP4Yr6I+J3jK/1H9h/Staurhhf6tHaRSyqdpZ925zx6+WT+NeEWljq8f7LGqalNeh9Jm163ht7XeT5cyxyGR8dBuDIM/7Ndj8UNQ2/sjfC7RlbBuA85Hsilf5yV01I80436M8HBVXQw9blulKknv1btc6b9lDUL208d+KPD1/PLJI1pDchZHLYKtg4z7SCvfviqzJ8EfFjozKw0q4IZTgj92a+d/htdWOj/twXdlp93BPZ3lobdJYJA6P/AKNG+ARweYyK+h/iv/yQ7xb/ANgm4/8ARZrjxC/ep97H1GTSay2pTvfkc1+v6nxZ/wAJXewfs1Wvhi2u7h7zUvEEkzbZG3mOOKIKuc55dx/3zXafHnQrrwV8Pfhv4fS6uFngs7g3LCRgXlYxs5Jzz8zGvHPC+qLpHjHQ9UuoxNbWN9DO0bjK4V1Zhj6CvoX9r90kufB0sbbkaK5ZSD1BMXNd81y1Yx6O7PksNU9rl9eq3rFQivS6/NlbxncXK/txeEoVuJhG39nZQOQp+X0rmPFtrr/xj/aD8V6dLrTW0GjRXcltHJlo0jtztCqoIALHkt796y/Dmk+LdF/al8IWPjWeabVfttpJvmuftDeWT8g3ZPGO3aup+HX/ACc58Sf+vLVv/RorOyhqt0v1OlVJYp8lRNRnVd11+HY7/wDZg8a6nqPwp1621m8luYtDcPBJMxZliaMtsyecAocexxXgXwy13UrT43eFtfurycwXmseW26RiDuIVsjOP+WortvglqZ0f9nH4q34bay2kcan/AGnjkQfq1ee3BtNL+E/grV7a6ga+h1a8nkiRwXjCtAULLnIB8s4JqowSnNW30/AmviZyw2Fk5awTl/5Okj9Ef4fWvgT4n+BPE3gz4pwaJfa2k0usSm4gaCaTbGsszKobIHI74r72tZ0urGK5jOUlQSKfYjI/nXyf+0t/ycZ4N/64W3/pUa4sFJqbR9NxTRhUwsaj3TVvm1c5j4yeGNc+HvgnwF4Z1LVfPvIRfPJNayvtcNMjDk4JwDjmm/tBavf6T+0VHe2l3PG1raWU6KshA3Ku7p+Fdj+2B/yH/CH/AFyuf/Qo65j416K/iP8AaqttCjGXvLG2iQZ/i8lsfqBXXQlzKMpdmfO5nSdKVejR6Sppf+As3/EWtHVv25PCd9aXEv2S6SwnVA52lXi3Djp0IrH+GFzdP8R/iur3M7BNF1MqDISFPm8Eelcf8NNXm1j9oPwE9wG820e2sjn0jDKP/HcD8Kow6R4v1b4heNR4Rnmia2+23F/5Vz5G61WU7weRuHT5e9V7NJcr7L8zD67KbWIim71JOy84o9//AGQpp5/A3iMzzSSkX8YBkctj90PWsT9r24uIdT8JCC4li3R3WfLcrn5o/Stj9j/H/CC+Jcf9BCP/ANFCsP8AbCz/AGp4Qx/zzuv/AEKKsF/vf9dj2Ksn/q6n6f8ApRi/DO38S/DX9rPT/BEuvTaha3SBZ1Dt5cqPbmVSUYnDKcc+x9atfDy5uW/a48eRNcTNGsOqYQuSB+8GMCqHw1Oq+E/2u7K0+JEb6lrt3GsUF8bjzBG0kX7t+nzAr8mONuatfDr/AJO+8ff9cdV/9GCtJrWT/unFhZWVGKukqr0e6Vtmc1+zr4pudP8AiJqWmXV3NJFqej3MarJIT+8RDIuMnrhX/Om+Abu7f9lz4oSNdXDOraftYyElcynoe1cP4UW50bSE8dWwY/2ZqcNtJt/uSxSZH4hCPxrs/AAx+yz8Ux6Np/8A6NNa1IK7ku8fzPNwOIm4wpSe0ar+Tj/mmSa9d3Y/Yz8Jyi7nEja9dAv5jZIw/Gc19g/Dgl/g74WZyWY6VbEknJP7pa+Ab3SfFsXwr07WbueY+GJ7ySG0iNzuRZwDvIiz8p4POOa+/fht/wAkb8K/9gm2/wDRS1y42KUFbuz6HhetKriJcyatCC1/P5nxzqXhfWPHP7RXjXRNP1p7KS3nv7xDI7lWEb/c4PGc9e1bPhDxZreq/sh/EDSr/Ubq4TTHtGtZJJCzxrJKMoGznGUyB7mtXwD/AMni+PP+uOq/+hiuN+H/APybH8U/pp3/AKONdEtVZ9OU8aknCo5xbvL2yfyWhb167ux+xr4RlF1OJDrt0C4kbJGH4JzVPxVo03h3wt4K8EaLqlykXia3g1e/dmKiWadhGikDqiAHjuSSe2Jtf/5Mw8If9h67/lJWh8QP+Rz+D3/YD0v/ANHVS0dvNmdX3ouT35Ka++1/vD4d+DYfD37YWneCNZvZNQj0q7eSGRCUQyLF5qNtycchcjPOKg+Dfii40f8AaqgS5vJmt72+ubB1eQlfnZtnBP8AeC12Fh/ykcn/AOvuT/0jrx21tLuPXvEnimy3CbQNSjvQR2Buiv8APbU/Hfm6xX4lSf1VxdL7FWf3RUf0PRvhL4n1HQNR+Kuv288rz2WmzTQCRiwR/ObacH0JFef/APCN+ILn4Xz/ABdk8STm5TVxZEl389nKhvN8zPHJHFb/AMO7hbvwp8W7tRtWbRHkA9A0+f61c8JfEjxd8PvgXYSeH9NsbmxudVuvtMt7aNNHG4SHYMggKSC3B64p2cW+Va3X5GanCrSpqtJ8qjN6a2fNZOx9dfDLWr3xH8IPDmualJ5l5dWMbzP/AHnxgt+OM/jXWVynw01u78S/CXQNev47eO5vbRZpUt02Rgn+6vYV1dePNWkz9Owr5qMHe+i176BQelFFSdB8S+MNe13wP+17r/i3S9An1CSC5kWNHik8t98ATOVHOM5/Crvw28G+IbT4C/EzxPqmmXVv/aOmmC1jkiZXmwWZ2VSM4yQB6819m0h4Fdjxd4pJdvwPmocOJVpVZVW03JpW2clZvzPhP4d/F34g/DPwnNoOieFYLq3kuWui93ZzlwzKoI+UgY+UV6B40t9Qu/26PCmofYbgxt9hd5FiYop2tnnGBivYPDWmfFuD42avfeIdYtpvB0nnfYbRHQumWXy8gIDwN3UmvTadTEJS5klqvzMcFk1SdBUqlSVoyTSaS+F9NdmfEGmeFL7w7+2ta2EenXQtIfEAkjkETbBG7b1+bGMYYflWt8M7C/j+K3xUeSwukWTSdUCM0LAOTLwASOc+1fZNFKWLb3XSxtS4bhTknGeik5bd1a2/Q+cP2Q7S7tPBviRbu1nty17EQJYyhP7vtmuo/ag0qfU/gNM9tbyTS2t/BMFjQs2CSh4H+/Xs9FZOs3V9rY76eVRhgPqLldWavbv5HzL+ydot1ZeF/FupXdpNA80sVuoljKEhUZjjI/2xXl/w903Uo/g18V45NOvEeSxtQitAwL/v26DHNfdVIelafWm5Sdt7fgcS4egqVKkp/ApLbfmVu/Q+G/hz8YfiF8PPC8XhjSPCsFxaG5aYyXVpOXy5GeVIGOPSu98QWd5J/wAFC9MuhZXDW++DMoiYp/x6kH5sYr1zwXpfxatfizrl54u1m2ufC8vnf2dbRuhaPMgMeQEB4TI5Jr0yqqV0pNpLVfmYYLJ6k6EadSpK0JJpNJW5b+ezPiDwP4Vv/DX7Ztnpn9n3S21prM6JL5TbPL2yFDuxjGCK+pfjLHJN8AvFkUMbyO2nyBURSxJ9gK7qisaldzlGTWx6OCyeOEoVaEZaTbe211b8D877TU/F198LYfhlY+FryaObVf7REiW8hlkkKBAgGMAd8/yrvPip4S1iK++GXw6kt7hpLTTIYLiWGJnWKSabD8gY4219qd6K3eNfMmonmw4Wiqcqc6rd0lt0Tvbc+KY/Ac3wl/ay8Madp73+oWKXNs/2xrcgbZSY2B2jHGTX1R8U45Jfgl4rjiRndtKuAqoCST5Z4AFddRWFSu6ji3uj1MFlEMJTq0qb92bena6t8z4JXwfd3f7Jx1ZdKuBe2XiNg6+QwkaKSBF6YyQGC/rW38X7zVPFHwg+F9+bC8kuY7Ge3uFEDlleMxxncMcZ25/GvtvFFbfXHzKVup5v+rEVTlTVTSUUnp/K733+R8meMrG9f9t/wncpZXLQqdO3SiJiowvOTjFcv4wk8S/B39oDxVqn9itd2+tRXcdtNIGEbx3B3bgwHLKeCvt7g19t0140kADorAc4IzUxxVrXWlrGtbh5T5pQqNScuZO22lreZ8T6Z4Y8Q+F/2O/EV1eaddxS+ItRtIre3MTeYYYzu3lcZAOGxnsAe9c/4i+D8+jfAnw/47hl1C4vtUlEc9h9m/1CkOQeBu/gHX1r76xxRVLGyTul1uY1OFaE4qMp7R5Vps73vv66HKfDO+l1L4OeGbydHSZ9NgWRXUqwZUCnIPuDXz5+0hZXtz+0N4Plt7K5mjWG33PHEzAf6UTyQK+rqKwp1eSbnY9fG5b9aw0cPKVrW1t2/wAz5Y/a4sr2717wkbSzuLgLFcbjDEz4+aPrgVD4usr1/wBu3wxcrZXLQD7FulETFBiM5y2MV9W0VcMS4xUbbJr7zlr5HGrWnW5/ilGW38vTfqfEGieFL7w5+2ra6fHp9yLSDXy8cgibYI2JdfmxjGGFanwx0/UIviN8VnksLpFk0bU1RmiYByZeAMjn8K+y8UVbxja26WOalw3ClJONTRSctu6tbfofOn7ItpdWvgbxGt1az25a/jIEsZQkeUOmaxP2urO9utT8JG0s7i42R3W7yomfHMfXAr6morNYj977Wx1yyVSy5Zfz6d7ed9j428BxeLfiv+1HpXjO98PTabaaeYpJ38txHGsKYRdzAZZmxx7n0rQ+HtjfR/ta+O55LG5SJ4dU2yNEwVsyDGDjBr64x70tW8Ve6S0tYwpcPqDjKVRuSk5N23drfI+IPhv4TvtY/Zq+JdnLp1ylxD9kvYEeJlZmi3sdoI5OAw49ai8CadqMf7MPxQhfT7tZJHsNiNCwZ8SnOBjmvuSim8Y3fTqn9xjDhmEeS1TWMZR235r679Lnw1runai37G3hS3XTrszLr10zRiFtwGH5IxkCvr74co8fwf8AC8ciMjrpVsGVhgg+UvBFdPRWVWv7SNrdbnoZflCwdR1FK/uxjt/L1PhPUvEHiHwR+0R401zS9AnvJLm4vrNPMhk2ASOfnGBzjHTvXafC34V+KL39mbxzBNp81rda2sRsLedTG8ogO8HB5AY/KM/XpX1xiitZYttWStt+Bw0OG4QqudSo5L3rK1rc25+eAvvF+v8Ag3SPhHbeG5zc2Woy3CKInExkkyCrqRhQMtz+fSvWPjz4F17wxB4E8TWFo99b6FYW9hctEhZY5IWDqzY6KxyM+3uK+tBGglMgRQ54LY5P404qGBBGQabxjck0v6ZFPhiKpThOq23ZJ22UdtOp8jfBe11/4jftQ3nxQutJewsIjJM7Yby97ReUkasQNxxyfp7isn4WeFL3Xrz4saNcWNzH9r02cQmSJlDSCdmTBI5+YCvs5ESNNqKFX0AwKdUvFPWy7fgbU+HoRUOed2nJvTdyVn6Hw98EvC+s6x4d+Imjx6ddRXN54fMcCyxMm99+QoyOpIxXI22t+JpvgrffD6DwzcvbW2qLqVzdCJ98LYEYjZccfN+PXjvX6HY96asaIzMqgEnJIHWr+u6tuJyvhZKnCnCq1ZNN23Td+5xHwYikh+AXhSKaN45F09AyOpUg89Qa7qiiuKT5m2fUUKXsqcad72SX3BQeBRR2pGpxL/F34cR3LW8niuzSRWKMrK4wQcHnbXVrqdg+jnVUuopLLyjN56HchQDO4EdRivnbwTqtxbeDtbsovhlceJA99c/6YsaMgzxsOQW468etd38NfJT9mWaKK9FyyWt2JFAI8liGJjweeM121sNGC072Pkcqz+tipqNRLWLlopK1mtNdJb7rY9Ci8TaFP4SPiiLUY20kRNN9rAO3YucnGM9j2qzbavpt5oSaza3cctg8XnrcIcqUxnP5V5Pon/Jl8n/YJuP/AEJ657wZq9/4H8MQ+HdbmaTRdf0prvTLpuBDO0WXhPpknj6j1NL6smpWeqdi/wDWKdOVH2sVyzpqTfaT2v5N6etj3Kz8R6LqHhf/AISOzvkl0vy2m+0gHbsXO49M8YPbtU1hrWm6poMetWF0s9jLGZUnUHDKO/PPY15n4G4/ZG/7hV5/OSue8HeOPFFh8ILDS7X4catfWsdk0a38UqiN1O75wMdOf0qXhr83L0djWOf8nsXWWk6fPopPXTTS+mvX7z2zRdb0vxDo8Oq6PdrdWc2fLmQEBsHB689Qadq+s6boOjzarq90trZw4MkzgkLkgDpz1IriPgb/AMkN0bvzN/6NapfjZx8DNeP+xF/6NSo9kvbez6Xsdscym8r+vWXNyc1ul+W/3F+x+K3w81G9S0tfFdg0znaquWjyfTLACum1DUrLS9Kn1LUJ1htLeMyyynkIo5J4rlR4H8J658PrWyv9D08CayjzMkCo6nYPmDAZB75rh9B1K91L9kjWvt07zta213aRzNyZI0yFOe/HH4VXsoS1jfe33nN/aWLoXjiFFtwlOLV18Nrppt91qmevRaxpsvh5ddiukbT2g+0i4AODHjdu9cY5p2l6rYa1o0Gq6Xcrc2dwu6KZQQGGcZ557Vxukn/jGa3/AOxeP/og1ytrq19on7GcGoadI0dyun7FkXqm6UqWHuATS9indLvY0lm7p2lNe77J1HbfS2i+87jVfip4A0TVW03UfEtrHdIdrogaTYfRioIFdPp2pWGradFf6bdw3VrKMpNCwZWH1Fcn4J8E+FtK8BWNvDpVldefbpLPPNEsjTsygliSORz0rm/BFrF4Y+PHiXwlo7FNHktItQW2BytvKSAQvoDnp9PShwg0+S90KljsZSnSeKUeWo7e7e8W02rt/FtZtJHo+meINH1m6vbbTL+K5msZjb3KJ1icdQQfx9uKWz1/SNQ1y+0ezvUlvrDb9qgAOYtwyueMcj0r560y51rwv4/8WeP9LElxY2Wty2mqWajlrdmz5g91P+cZrvvhxf2mqfGvx5qNjOs9rcLZyxSJ0ZTGcGtKmGUU5J6Jfjp/mceB4iniKlOjKKjKU2n5xSk1JfONn2d/I7vxF4z8MeE4kfxBrFvZGQZRHJZ3+ijJP1xSeHfG3hbxZG7eH9Zt71oxl41JV1HqVIBx74rz34b6Xp/ifxX4q8YeILeK+1KPU5LKGO4UOLaKP7oVT0zn9PrVaLxf8M1+IenaynhbW9O1ZpPscM32E28cjOdvzAEBvxzxSdCOsUm2i451WfJiJyhGlN2Sd+aydr32v5W8rntVZeueI9D8Naf9u13U7exgzgPM2Nx9AOpPsK1B0ryG002z8X/tI+IP+EhhW6g0K3hjsbKcboxvGWk2ng8/zHoKxpQUruWyPXzHF1KChCik5zlyq+y0bbfok9Op2vh/4jeC/FN4bPQ9etrm56iEgxuw9gwBP4Vo+IPFGg+FrGK88QalHYwSv5SSSAkFsE44B7A15f4u8S/DG18SLLrPhTWYbrRrnct7aWBiTcp4/eKRuXOOtWPjZdiXw54RvoLJrwPq8MqWpAzNlCQmDxk9PxrZUFKcVZpM8ipnVWlha83OEp07bX6u2sd112bvY7jRPiJ4M8SasNM0PXre9uyhk8pFYHaOp5A9a1bfxBo914ju9Bt7+J9StEWSe2GQyKwBB9xyOnqK5HwVqk+o6/Klz8Ln8MbISy3jpGN5yBsBVQe+fwrzfxLaa/H+0H4p8S+GWLX2iQ210bXtcxGNRIn5c/h64ojQjKTjtZeT/IdfOq+Hw9Os4qfNOztGUdLNuylrdW+Z7sdf0geKP+EdN6n9qeR9p+zYO7y843ZxjGaytb+Ivgvw3qzaZrmvW9ldqocxSKxO09DwCK4Dwz4h0/xV+0fZ67pj7re48N52k8xt5vzI3uDxVDxLezWH7S2pyweDn8UE6TCv2RFUmMZHz/MCPb8accOubll2uZ1s/qPD+2o2s6nInZyVrXvZat+h67ofivw/4l0ybUNC1OK9toGKSSRggKwAJHIHYisFPjB8NZJVjXxbZBmOBuDqPzK4q34YuXvPBd1cy+Ez4ZlbzA1kyqpOF4c7QBz/AErxLwZ428DaP8HI9J17w1Pf3r+cm/7AGSUszbVEp78j6fhRToRnzaPR+Q8dnVXDexTnCPNGUm5KSWnLZJXTV79bn0rBPDc2yXEEqSxSKGR0IKsD0II6isp/Ffh6PxYvhl9VgGrsu9bPJ3kYz9OgJrnvhfpmpeGfg9p9r4gJhmhjkmdJGyYIyxYKT7D8q8YnaS60a6+MyXEf9pJrouYoPMG/7Gp8vbtzn/6wqaeHUpSV9FovXoaY7PauHoUaqp+9Jc0k+kUk5fNXVj6V1XVdP0TSJ9U1S5W2s7dd8szAkIM4zxz3qa1uoL2yhvLWQSQTIskbjoykZB/I1w3xQvINQ/Z/1u/tn3wXFissbDurMpH6Gul8IH/igNDz/wBA+D/0WtYuFoc3nY9aGMc8Y8Ovh5FK/q2v0No8Csyx8QaRqWsX+lWV6k15p7Kt1CoOYiwyM5Hf2rS6ivCdO8S614e+Nvjw6R4Rvtf865hEn2Rwvk4TjOQeuT+VVSpe0UrdF+plmeZfUpUeZe7KVno2/hb0S13XY9kg1/SLrxHd6Db3iPqNmiyXFuAcxq33STjHORVbxD4w8NeFLdJvEGr29iJPuLISWf6KMk/lXm3w51S+1n4++LNQ1LRp9IuZLG3DWdwwZ48YAyR6gZ/GpvAelWHiv4n+MPEviG3ivb2x1FtPtYbhd620SdCFPAJ9fr61o6EYt82yS/E8+lnNbEU4KglzTnOKvdJKLerW97LbTV9DvvDvjjwr4s3jw/rNveugy8S5V1HqVYA496ua94l0Pwxpf9o69qMNjbZ2h5Dyx9AByT9K80+LOkad4am0PxroVtDY6tBqUUB+zoE+0xvkMjAdeB+Wa1vif4Z1vVNW8P8AiLRNMt9XbR5Xkk0u5YKs4YDkZ4yMd/8A61JUoNxd9GXPMsZTp1qbgpVafLsnZqXW2+mt1e7to9TrfDnjPwz4tt5JfD2rwXoj/wBYq5V09MqQCPriqOsfEvwPoGsS6VrHiG3tLyHHmQurkrkAjoMdCK5fwXrXhDUviPOX8K3PhrxY1qUktrmPyxLGDklMfK3bnGcD2rmbzxJ4V8N/tFeLpvFVv58M0FskK/ZDcYYRqTwAccVUaCc2rPRXOetndSGGpVeeF5T5XJ35Vo3qm009Nm9LntWla1pWuaYmo6PfwXtq/CywMGGe49j7VQi8aeGJvC9x4jj1eFtKt2ZJroK21CCAQeM9SO1cN8ILWR9V8V67Y6ZPpug6jdq+n20qeXkAEM4XsDkf5FO+B9tb3fwluLe6ginifUrkNHKoZW+YdQeDUzoxjzeVvxOrCZrXxHsY8qTnGb62vFpJrZ2d797G5/wuL4aYz/wllpj12Sf/ABNdY2racuhf2y13Gth5H2n7QeF8vbu3fTHNeW6Pomiv+094isn0iwa2TSYHSA26FFYlckLjAPNX/jNfiLwXYeEdOeO3n1y6jsVxhRHCCC59gBgfjTlRg5xhC+tjKjmmKp4WvicTyvkcopJNXadlu3u7HfaJr+j+JNLGpaJfxXtqWKCWPONw6jmh9e0hPFEfh171BqkkBuUtsHcYwcFumMZrzH4bm08JfFvxD4EtbiN9OuI01HTyrhh0CuuR3/8Aia0Lw/8AGW+m/wDYAf8A9GNSdFKTSelro0o5vUlhqdSSXO5qEl0TvZ2/NeTPUKKKK5j6EKD0oooA8c0LwL8WPDFnd6foPiDw5DaXF1Lc/voXkdS59dvbArrfDPgRvDXw0vvDq332u9vVnknunG1XmlXBOOwHH5V21FbTrylueRhckw2HacbuyaV5N2T3suhwGneBtTs/gA/gSS6tWvmspbbzlLeVuYsQemcc+lSXvw8g1n4NWfgvVmiNxa2kccdzGCRHMi4DrnnGfzBNd3RS9tO979b/ADNFlGF5eRxuuTks/wCXt/wTh/D/AIO1LSPgifBk9zbPeGzntvOj3eXuk34PIzj5h2q94V8OXmhfCyy8M3U0MlzBaNbtJHnYSc8jIzjn0rqqKTqyd79Xc0o5dRpOLgvhjyLX7On+Rynw58M3vg/4d2Hh/UJ4Jp7bzNzwZ2nc5YYyAe9P+IXhu88W/DrUfD1jPDDPdBArz52jDqxzgE9Aa6iil7SXPz9dy1gKKwv1O3ucvL8rW39DyX/hDvi7f6Smh6n4z0ez00xiCR7C2bzvLAwVBIGMjjOa7i28HaNZ/DtvBlvEy6a1s1sefmIYHLE/3iST9a6KiqlWlLy9DDD5TQoNvWTateTctOyvsvQ8bXwH8WLfwyfBlv4q0f8AsLyzbLdNC32lYDxtxjHTjr+Nei2XhLSrT4eReDniM+npa/ZGV+rrjBJ9CTz9a36KJ1pS/P5iwmT4fDNuN5XXL7zbtHsr9DyS08HfFjwva/2L4V8UaRd6Qny27apExmt07LkAg4/yBXU+BfAx8KLfahqOovqut6i4kvb9xjcR0VR2Uf57CuyopyrykrdxYbJsPh6kakeZ8vwpybUemie2mnocR4P8F3WhXviptTe1ubfWtQkukjQE4jYEbXBHXmqPw8+GzeAvFPiC4t7qKXTb8x/ZYufMiCliVbjBxuwD7V6LRSdabTV9yoZRhYSpSUdabbi+3Ne/y1PM9a8AeJtN8Y3nij4ea3a2E9+Q17p96haCZ/74wCQf8TzSaX4E8X6x4vsfEPxE1uzuxpz+ZZ6dp6FYUk/vsT1I/wAntXptFP6xO1vx6mbyTDe059bXvy8z5b3vfl2317X1sA6V5/4v8Barf+KofGHg7WU0nXo4/IkMqb4bqPsrj29eeg9BXoFFRCbg7o7cXg6WLp+zqrzVnZprZprVM8ol8C/ELxhdW1t8Qde0waNBKsr2GlIw+0lTkB2YDj/PvW58SfB2seKtM0eLw/d2dpc6dfJeI10G2fKpAGAD3Iru6Kv28rprocayXD+ynSk2+e1223J2216W6WOG8N2HxSg8QJJ4q1vQrvTQjborOBkkLY+U5IHFTaR4SvtP+MHiHxZNPbtaalbwwxRLnepQAEtxjHHrXZ0VLqvXzNoZdTioKTlLlfMm2272a+6zZ5toHwvXw18aLzxZpc0EemXds6m0wQ0crMpO3jG35c+2cVB4g8FePD8Vrrxh4R1fRrT7RZx2jLeoznCnJ4AI6gV6hRVe3nfmeuljB5HhVS9jBOK5ufRtWl5dvQ5fw3Z+Mo9DvYPGGoabeXkhIhexjKIqFcYYEDnOa5/Q/hoYvgafAWvywTSHzCJoMkIxcsjLkA5BI/WvSKKn2sltp1N3llCdvaXlaLjq73UrXv32RwF14b8a3fwTk8KXGp6e2svB9ka93PsaPOCx+XO4px061Sg+Bnw/XQ47afRg94IBG10JpAS+3BfG7HXnGK9MoqlXmtIu3UynkuEqtSrQ52oqK5tdF69e73Z5rB4E8RH4AXHgO+1CylvvJa2huVLeXs3hl3cZ4HHTsKTw5oXxb0q50yz1DX/DsukWuyKSKGBxI0SjGAxXrgDmvS6KPbys07a67CWTUIyhOMpJxSirSaulsn3+Yn8PFcb4Z8J3+i/EPxXr9zPbyW+sSxSQpHncgRSDuyMd+1dnRWcZtJpdTurYaFWcJz3g7r1s1+TZxmk+E7+w+MGv+LZJ7drTUraGGOJc+YpQAEtxjHHY1la/4C8RWnjK48W/D/WbfTr68AF7Z3iFre5I6McdG/zxk59Ioq1Wknf5HJPKcPOn7OzXvOSabTUm220+m7+Wh5jp3gHxXrniux174ja1Z3i6e/m2mmaehWBZOztkckf5Patjxt4X8TarqOna14T8QnTtQsdwEFxlradW671Hf3wfwrtqKPbS5k+33CjlGHjSlS1953b5nzNrZ3306dDzXw74L8X3HxDg8ZeOtU06a6s7dre0tdOjKogbgsxIyeCfzrX0bwhe6f8AF3xF4ruJrZ7XU4II4olyXQoACWyMduxrs6KHWk/usOjlOHpKNrtqXNdttuVrXb66aDSvynFcf8NvCd/4M8HSaRqNxbzytdy3AeDO3DnIHIHNdlRUKTScejOyeGhOrGs/iiml87X/ACRxmn+E7+0+NOr+MJJ7c2d7Yx2qRDPmKylck8Yxx61m+I/ht/wmHxPi1fxIbe60G1szBBYh3VzITks2McfQ9hXotFWq00+ZPW1jkqZThqlN0pxvFy5mns3e+vdX6Hl1x8IdP0bxXoWveBbe20uaxuS11HLLIyzxEYZR15xn86n8XeDPGd78ULbxf4R1TSrOWGw+xEXqM+cszE4AI7ivSqKf1id7vXoYyyPCckqcI8qbUvddrNbNW2Oc8JW3jG2sJ18Zahpt7dGTML2EZRQmBwQQOc5ro6KKyk7u56dGkqUFBNu3Vu7+8KKKKRqFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAf/9k=';
  const DEFAULT_ORG1 = 'SỞ Y TẾ TP. HỒ CHÍ MINH';
  const DEFAULT_ORG2 = 'BỆNH VIỆN ĐA KHOA BÌNH DƯƠNG CƠ SỞ 2';

  let drugList = []; // { brand, generic, form } -- danh mục "Trong Bệnh viện"
  let outsideDrugList = []; // { brand, generic, form } -- danh mục "Ngoài Bệnh viện"
  let rxRows = [];    // toa thuốc hiện tại

  function normalize(str) {
    return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').trim();
  }
  function escapeHtml(str) {
    return (str || '').toString().replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }
  function unitFromForm(form) {
    const f = normalize(form || '');
    if (!f) return 'viên';
    if (f.includes('lo')) return 'lọ';
    if (f.includes('goi')) return 'gói';
    if (f.includes('ong')) return 'ống';
    if (f.includes('tuyp') || f.includes('tuyt')) return 'tuýp';
    if (f.includes('chai')) return 'chai';
    if (f.includes('mieng dan') || f.includes('mieng') || f.includes('patch')) return 'miếng';
    if (f.includes('vi ') || f.includes('vi thuoc') || f === 'vi') return 'vỉ';
    if (f.includes('vien')) return 'viên';
    if (f.includes('cay')) return 'cây';
    if (f.includes('cai')) return 'cái';
    return 'viên';
  }

  // ======================================================================
  // PHẦN 2: CẤU HÌNH PHÒNG KHÁM (logo, tên cơ quan, đồng bộ Supabase, DS bác sĩ)
  // ======================================================================
  // ---------- Cấu hình (org / logo / doctor / supabase) ----------
  const org1Input = $('rxOrgLine1'), org2Input = $('rxOrgLine2');
  org1Input.value = localStorage.getItem(LS_ORG1) || DEFAULT_ORG1;
  org2Input.value = localStorage.getItem(LS_ORG2) || DEFAULT_ORG2;
  org1Input.addEventListener('change', () => { localStorage.setItem(LS_ORG1, org1Input.value.trim() || DEFAULT_ORG1); pushConfigToCloud(); });
  org2Input.addEventListener('change', () => { localStorage.setItem(LS_ORG2, org2Input.value.trim() || DEFAULT_ORG2); pushConfigToCloud(); });

  // ---------- Logo bệnh viện (mặc định dùng logo đã nhúng sẵn, có thể đổi) ----------
  const LS_LOGO_X = 'rxOrgLogoX', LS_LOGO_Y = 'rxOrgLogoY';
  const PAGE_W_MM = 148, PAGE_H_MM = 90; // vùng xem trước tương ứng khổ A5 (chiều rộng) x phần đầu trang
  const DEFAULT_LOGO_POS = { x: 12, y: 8, size: 14 };
  const logoInput = $('rxOrgLogoInput'), logoPreview = $('rxOrgLogoPreview');
  const logoEditor = $('rxLogoEditor'), logoEditorItem = $('rxLogoEditorItem'), logoEditorHandle = $('rxLogoEditorHandle');
  const logoEditorOrg1 = $('rxLogoEditorOrg1'), logoEditorOrg2 = $('rxLogoEditorOrg2'), logoSizeVal = $('rxLogoSizeVal');
  const logoXVal = $('rxLogoXVal'), logoYVal = $('rxLogoYVal'), logoSizeMmVal = $('rxLogoSizeMmVal');
  const logoXInput = $('rxLogoXInput'), logoYInput = $('rxLogoYInput'), logoSizeInput = $('rxLogoSizeInput');
  const logoSyncStatus = $('rxLogoSyncStatus');
  function currentLogo() { return localStorage.getItem(LS_LOGO) || DEFAULT_LOGO_B64; }
  function currentLogoPos() {
    const x = parseFloat(localStorage.getItem(LS_LOGO_X));
    const y = parseFloat(localStorage.getItem(LS_LOGO_Y));
    const size = parseFloat(localStorage.getItem(LS_LOGO_SIZE));
    return {
      x: Number.isFinite(x) ? x : DEFAULT_LOGO_POS.x,
      y: Number.isFinite(y) ? y : DEFAULT_LOGO_POS.y,
      size: Number.isFinite(size) ? size : DEFAULT_LOGO_POS.size,
    };
  }
  function saveLogoPos(pos) {
    localStorage.setItem(LS_LOGO_X, pos.x);
    localStorage.setItem(LS_LOGO_Y, pos.y);
    localStorage.setItem(LS_LOGO_SIZE, pos.size);
  }
  function layoutLogoEditor() {
    const rect = logoEditor.getBoundingClientRect();
    if (!rect.width) return;
    const scale = rect.width / PAGE_W_MM;
    const pos = currentLogoPos();
    logoEditorItem.style.left = (pos.x * scale) + 'px';
    logoEditorItem.style.top = (pos.y * scale) + 'px';
    logoEditorItem.style.width = (pos.size * scale) + 'px';
    logoEditorItem.style.height = (pos.size * scale) + 'px';
    const textX = (pos.x + pos.size + 4) * scale;
    logoEditorOrg1.style.left = textX + 'px';
    logoEditorOrg2.style.left = textX + 'px';
    logoEditorOrg1.style.top = (pos.y * scale + rect.height * 0.02) + 'px';
    logoEditorOrg2.style.top = (pos.y * scale + rect.height * 0.20) + 'px';
    logoEditorOrg1.textContent = (org1Input.value || DEFAULT_ORG1).toUpperCase();
    logoEditorOrg2.textContent = (org2Input.value || DEFAULT_ORG2).toUpperCase();
    logoSizeVal.textContent = Math.round(pos.size * 96 / 25.4) + 'px';
    logoXVal.textContent = pos.x.toFixed(1);
    logoYVal.textContent = pos.y.toFixed(1);
    logoSizeMmVal.textContent = pos.size.toFixed(1);
    if (document.activeElement !== logoXInput) logoXInput.value = pos.x.toFixed(1);
    if (document.activeElement !== logoYInput) logoYInput.value = pos.y.toFixed(1);
    if (document.activeElement !== logoSizeInput) logoSizeInput.value = pos.size.toFixed(1);
  }
  function refreshLogoPreview() {
    logoPreview.src = currentLogo();
    layoutLogoEditor();
  }
  refreshLogoPreview();
  org1Input.addEventListener('input', layoutLogoEditor);
  org2Input.addEventListener('input', layoutLogoEditor);
  window.addEventListener('resize', layoutLogoEditor);

  function setLogoPosFromManualInputs() {
    const pos = currentLogoPos();
    const x = parseFloat(logoXInput.value);
    const y = parseFloat(logoYInput.value);
    const size = parseFloat(logoSizeInput.value);
    if (Number.isFinite(x)) pos.x = Math.max(0, Math.min(PAGE_W_MM - pos.size, x));
    if (Number.isFinite(y)) pos.y = Math.max(0, Math.min(PAGE_H_MM - pos.size, y));
    if (Number.isFinite(size)) pos.size = Math.max(6, Math.min(40, size));
    saveLogoPos(pos);
    layoutLogoEditor();
    pushConfigToCloud();
  }
  [logoXInput, logoYInput, logoSizeInput].forEach((el) => {
    el.addEventListener('change', setLogoPosFromManualInputs);
  });

  // ---------- Đồng bộ logo/tên cơ quan giữa các máy qua Supabase (dùng chung 1 dòng cấu hình) ----------
  const CLOUD_CONFIG_KEY = 'rx_logo_org';
  function cloudHeaders() {
    return {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    };
  }
  let pushCloudTimer = null;
  function pushConfigToCloud() {
    if (logoSyncStatus) logoSyncStatus.textContent = 'Đang đồng bộ...';
    clearTimeout(pushCloudTimer);
    pushCloudTimer = setTimeout(async () => {
      try {
        const pos = currentLogoPos();
        const payload = {
          key: CLOUD_CONFIG_KEY,
          value: JSON.stringify({
            logo: currentLogo(),
            x: pos.x, y: pos.y, size: pos.size,
            org1: org1Input.value.trim() || DEFAULT_ORG1,
            org2: org2Input.value.trim() || DEFAULT_ORG2,
          }),
        };
        const resp = await fetch(`${SUPABASE_URL}/rest/v1/logo`, {
          method: 'POST',
          headers: { ...cloudHeaders(), Prefer: 'resolution=merge-duplicates' },
          body: JSON.stringify(payload),
        });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        if (logoSyncStatus) logoSyncStatus.textContent = 'Đã đồng bộ cho mọi máy ✓';
      } catch (err) {
        if (logoSyncStatus) logoSyncStatus.textContent = 'Chưa đồng bộ được (kiểm tra mạng / đã tạo bảng "logo" trong Supabase chưa?)';
      }
    }, 500);
  }
  async function pullConfigFromCloud() {
    try {
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/logo?key=eq.${CLOUD_CONFIG_KEY}&select=value`, {
        headers: cloudHeaders(),
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const rows = await resp.json();
      if (rows && rows[0] && rows[0].value) {
        const cfg = JSON.parse(rows[0].value);
        if (cfg.logo) localStorage.setItem(LS_LOGO, cfg.logo);
        if (Number.isFinite(cfg.x)) localStorage.setItem(LS_LOGO_X, cfg.x);
        if (Number.isFinite(cfg.y)) localStorage.setItem(LS_LOGO_Y, cfg.y);
        if (Number.isFinite(cfg.size)) localStorage.setItem(LS_LOGO_SIZE, cfg.size);
        if (cfg.org1) localStorage.setItem(LS_ORG1, cfg.org1);
        if (cfg.org2) localStorage.setItem(LS_ORG2, cfg.org2);
        org1Input.value = cfg.org1 || DEFAULT_ORG1;
        org2Input.value = cfg.org2 || DEFAULT_ORG2;
        refreshLogoPreview();
        if (logoSyncStatus) logoSyncStatus.textContent = 'Đã lấy cấu hình mới nhất từ máy chủ ✓';
      }
    } catch (err) {
      // Không có mạng hoặc chưa tạo bảng: tiếp tục dùng cấu hình lưu cục bộ trên máy này
    }
  }
  pullConfigFromCloud();

  logoInput.addEventListener('change', () => {
    const file = logoInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      localStorage.setItem(LS_LOGO, ev.target.result);
      refreshLogoPreview();
      logoInput.value = '';
      pushConfigToCloud();
    };
    reader.readAsDataURL(file);
  });
  $('rxOrgLogoClearBtn').addEventListener('click', () => {
    localStorage.removeItem(LS_LOGO);
    localStorage.removeItem(LS_LOGO_X);
    localStorage.removeItem(LS_LOGO_Y);
    localStorage.removeItem(LS_LOGO_SIZE);
    refreshLogoPreview();
    pushConfigToCloud();
  });

  // Kéo logo để đổi vị trí
  (function setupLogoDrag() {
    let dragging = false, startX = 0, startY = 0, startPos = null;
    logoEditorItem.addEventListener('pointerdown', (e) => {
      if (e.target === logoEditorHandle) return;
      dragging = true;
      logoEditorItem.classList.add('dragging');
      startX = e.clientX; startY = e.clientY;
      startPos = currentLogoPos();
      logoEditorItem.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    logoEditorItem.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const rect = logoEditor.getBoundingClientRect();
      const scale = rect.width / PAGE_W_MM;
      const dxMm = (e.clientX - startX) / scale;
      const dyMm = (e.clientY - startY) / scale;
      const pos = currentLogoPos();
      pos.x = Math.max(0, Math.min(PAGE_W_MM - pos.size, startPos.x + dxMm));
      pos.y = Math.max(0, Math.min(PAGE_H_MM - pos.size, startPos.y + dyMm));
      saveLogoPos(pos);
      layoutLogoEditor();
    });
    logoEditorItem.addEventListener('pointerup', (e) => {
      dragging = false;
      logoEditorItem.classList.remove('dragging');
      try { logoEditorItem.releasePointerCapture(e.pointerId); } catch (err) {}
      pushConfigToCloud();
    });
  })();

  // Kéo ô vuông ở góc để phóng to/thu nhỏ logo
  (function setupLogoResize() {
    let resizing = false, startX = 0, startPos = null;
    logoEditorHandle.addEventListener('pointerdown', (e) => {
      resizing = true;
      startX = e.clientX;
      startPos = currentLogoPos();
      logoEditorHandle.setPointerCapture(e.pointerId);
      e.preventDefault();
      e.stopPropagation();
    });
    logoEditorHandle.addEventListener('pointermove', (e) => {
      if (!resizing) return;
      const rect = logoEditor.getBoundingClientRect();
      const scale = rect.width / PAGE_W_MM;
      const dMm = (e.clientX - startX) / scale;
      const pos = currentLogoPos();
      let newSize = startPos.size + dMm;
      newSize = Math.max(6, Math.min(40, newSize));
      newSize = Math.min(newSize, PAGE_W_MM - pos.x, PAGE_H_MM - pos.y);
      pos.size = newSize;
      saveLogoPos(pos);
      layoutLogoEditor();
    });
    logoEditorHandle.addEventListener('pointerup', (e) => {
      resizing = false;
      try { logoEditorHandle.releasePointerCapture(e.pointerId); } catch (err) {}
      pushConfigToCloud();
    });
  })();

  // ---------- Danh sách bác sĩ ký (thêm / xoá / đặt mặc định) ----------
  const doctorSelect = $('rxDoctorSelect'), doctorDefBtn = $('rxDoctorDefBtn');
  function loadDoctorList() {
    try { return JSON.parse(localStorage.getItem(LS_DOCTORS) || '[]'); } catch (e) { return []; }
  }
  function saveDoctorList(list) { localStorage.setItem(LS_DOCTORS, JSON.stringify(list)); }

  function renderDoctorSelect(selectValue) {
    const list = loadDoctorList();
    const def = localStorage.getItem(LS_DOCTOR_DEFAULT) || '';
    if (list.length === 0) {
      doctorSelect.innerHTML = '<option value="">(chưa có bác sĩ nào, bấm + để thêm)</option>';
      doctorDefBtn.classList.remove('is-default');
      return;
    }
    doctorSelect.innerHTML = list.map((name) =>
      `<option value="${escapeHtml(name)}">${escapeHtml(name)}${name === def ? ' ★ (mặc định)' : ''}</option>`
    ).join('');
    const toSelect = selectValue && list.includes(selectValue) ? selectValue : (def && list.includes(def) ? def : list[0]);
    doctorSelect.value = toSelect;
    doctorDefBtn.classList.toggle('is-default', doctorSelect.value === def && !!def);
  }
  renderDoctorSelect();

  doctorSelect.addEventListener('change', () => {
    const def = localStorage.getItem(LS_DOCTOR_DEFAULT) || '';
    doctorDefBtn.classList.toggle('is-default', doctorSelect.value === def && !!def);
  });

  $('rxDoctorAddBtn').addEventListener('click', async () => {
    const name = await customPrompt('Thêm bác sĩ mới', 'VD: BS. Nguyễn Văn A', '');
    if (!name) return;
    const trimmed = name.trim();
    const list = loadDoctorList();
    if (!list.includes(trimmed)) {
      list.push(trimmed);
      saveDoctorList(list);
    }
    renderDoctorSelect(trimmed);
  });

  $('rxDoctorDefBtn').addEventListener('click', () => {
    if (!doctorSelect.value) return;
    localStorage.setItem(LS_DOCTOR_DEFAULT, doctorSelect.value);
    renderDoctorSelect(doctorSelect.value);
  });

  $('rxDoctorDelBtn').addEventListener('click', async () => {
    if (!doctorSelect.value) return;
    const ok = await customConfirm('Xoá bác sĩ', `Xoá bác sĩ "${doctorSelect.value}" khỏi danh sách?`);
    if (!ok) return;
    const list = loadDoctorList().filter((n) => n !== doctorSelect.value);
    saveDoctorList(list);
    if (localStorage.getItem(LS_DOCTOR_DEFAULT) === doctorSelect.value) localStorage.removeItem(LS_DOCTOR_DEFAULT);
    renderDoctorSelect();
  });

  // ---------- Cấu hình Supabase cố định (không cần nhập lại trên từng máy) ----------
  function getSbConfig() {
    return { url: SUPABASE_URL, key: SUPABASE_ANON_KEY };
  }

  // ---------- Kích thước logo (Admin cấu hình, áp dụng chung khi in) ----------
  // (kích thước/toạ độ logo giờ được quản lý trực quan ở phần "Kéo logo để đổi vị trí" phía trên)

  // ======================================================================
  // PHẦN 3: BẢO VỆ TRANG CẤU HÌNH BẰNG MẬT KHẨU
  // ======================================================================
  // ---------- Bảo vệ mục Cấu hình bằng mật khẩu ----------
  const patientPanel = $('rxPatientPanel'), drugFormArea = $('rxDrugFormArea'), settingsPanel = $('rxSettingsPanel');
  const pwOverlay = $('rxPwOverlay'), pwInput = $('rxPwInput'), pwError = $('rxPwError');

  function getAdminPw() { return localStorage.getItem(LS_ADMIN_PW) || DEFAULT_ADMIN_PW; }

  function openSettingsUnlocked() {
    patientPanel.style.display = 'none';
    drugFormArea.style.display = 'none';
    settingsPanel.classList.add('show');
  }
  function closeSettings() {
    patientPanel.style.display = '';
    drugFormArea.style.display = '';
    settingsPanel.classList.remove('show');
  }
  function showPwModal() {
    pwInput.value = '';
    pwError.textContent = '';
    pwOverlay.classList.add('show');
    setTimeout(() => pwInput.focus(), 50);
  }
  function hidePwModal() { pwOverlay.classList.remove('show'); }

  $('rxSettingsBtn').addEventListener('click', () => {
    if (settingsPanel.classList.contains('show')) { closeSettings(); return; }
    showPwModal();
  });
  $('rxSettingsCloseBtn').addEventListener('click', closeSettings);
  $('rxPwCancelBtn').addEventListener('click', hidePwModal);
  $('rxPwOkBtn').addEventListener('click', () => {
    if (pwInput.value === getAdminPw()) {
      hidePwModal();
      openSettingsUnlocked();
    } else {
      pwError.textContent = 'Sai mật khẩu, vui lòng thử lại.';
    }
  });
  pwInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') $('rxPwOkBtn').click(); });
  $('rxPwEyeBtn').addEventListener('click', () => {
    const isHidden = pwInput.type === 'password';
    pwInput.type = isHidden ? 'text' : 'password';
    $('rxPwEyeBtn').textContent = isHidden ? '🙈' : '👁';
    pwInput.focus();
  });
  $('rxPwForgotBtn').addEventListener('click', () => {
    customAlert('Gợi ý mật khẩu', 'Mật khẩu gợi ý: "KK****HA"');
  });


  // ======================================================================
  // PHẦN 4: DANH SÁCH THUỐC (tải, lưu, upload Excel, autocomplete)
  // ======================================================================
  // ---------- Danh sách thuốc: tải từ cloud (nếu có cấu hình) hoặc localStorage ----------
  async function loadDrugList() {
    const sb = getSbConfig();
    if (sb) {
      try {
        const resp = await fetch(`${sb.url}/rest/v1/thuoc?select=ten_tm,ten_goc,dang_thuoc&order=ten_tm.asc`, {
          headers: { apikey: sb.key, Authorization: `Bearer ${sb.key}` },
        });
        if (resp.ok) {
          const rows = await resp.json();
          drugList = rows.map((r) => ({ brand: r.ten_tm || '', generic: r.ten_goc || '', form: r.dang_thuoc || '' }));
          return;
        }
      } catch (e) { /* rơi về local nếu lỗi mạng */ }
    }
    try { drugList = JSON.parse(localStorage.getItem(LS_DRUGS) || '[]'); } catch (e) { drugList = []; }
  }
  loadDrugList();

  function saveLocalDrugList() {
    localStorage.setItem(LS_DRUGS, JSON.stringify(drugList));
  }

  // ---------- Danh sách thuốc "Ngoài Bệnh viện": localStorage riêng, có sẵn danh mục khởi điểm ----------
  function loadOutsideDrugList() {
    try {
      const raw = localStorage.getItem(LS_DRUGS_OUTSIDE);
      outsideDrugList = raw ? JSON.parse(raw) : DEFAULT_OUTSIDE_DRUGS.slice();
    } catch (e) { outsideDrugList = DEFAULT_OUTSIDE_DRUGS.slice(); }
  }
  loadOutsideDrugList();

  function saveOutsideDrugList() {
    localStorage.setItem(LS_DRUGS_OUTSIDE, JSON.stringify(outsideDrugList));
  }

  function mergeNewDrugsOutside(newDrugs) {
    const existingKeys = new Set(outsideDrugList.map((d) => normalize(d.brand) + '|' + normalize(d.generic)));
    const toAdd = newDrugs.filter((d) => {
      const k = normalize(d.brand) + '|' + normalize(d.generic);
      if (!d.brand || existingKeys.has(k)) return false;
      existingKeys.add(k);
      return true;
    });
    if (toAdd.length === 0) return 0;
    outsideDrugList = outsideDrugList.concat(toAdd);
    saveOutsideDrugList();
    return toAdd.length;
  }

  async function mergeNewDrugs(newDrugs) {
    const existingKeys = new Set(drugList.map((d) => normalize(d.brand) + '|' + normalize(d.generic)));
    const toAdd = newDrugs.filter((d) => {
      const k = normalize(d.brand) + '|' + normalize(d.generic);
      if (!d.brand || existingKeys.has(k)) return false;
      existingKeys.add(k);
      return true;
    });
    if (toAdd.length === 0) return 0;

    const sb = getSbConfig();
    if (sb) {
      try {
        const resp = await fetch(`${sb.url}/rest/v1/thuoc`, {
          method: 'POST',
          headers: {
            apikey: sb.key, Authorization: `Bearer ${sb.key}`,
            'Content-Type': 'application/json', Prefer: 'return=minimal',
          },
          body: JSON.stringify(toAdd.map((d) => ({ ten_tm: d.brand, ten_goc: d.generic, dang_thuoc: d.form || '' }))),
        });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        await loadDrugList();
        return toAdd.length;
      } catch (e) {
        $('rxExcelStatus').textContent = '⚠ Lỗi đồng bộ cloud, đã lưu tạm trên máy này.';
        $('rxExcelStatus').className = 'rx-sb-status err';
      }
    }
    drugList = drugList.concat(toAdd);
    saveLocalDrugList();
    return toAdd.length;
  }

  // ---------- Upload Excel ----------
  function pickCol(headers, candidates) {
    const normHeaders = headers.map(normalize);
    for (const cand of candidates) {
      const idx = normHeaders.findIndex((h) => h.includes(normalize(cand)));
      if (idx !== -1) return idx;
    }
    return -1;
  }

  $('rxExcelInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const statusEl = $('rxExcelStatus');
    statusEl.textContent = 'Đang đọc file...';
    statusEl.className = 'rx-sb-status';
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        if (rows.length < 2) { statusEl.textContent = 'File rỗng hoặc không đúng định dạng.'; statusEl.className = 'rx-sb-status err'; return; }

        const headers = rows[0].map((h) => String(h || ''));
        const brandIdx = pickCol(headers, ['ten thuong mai', 'ten biet duoc', 'biet duoc', 'ten thuoc - ham luong', 'ten thuoc']);
        const genericIdx = pickCol(headers, ['ten goc', 'hoat chat']);
        const formIdx = pickCol(headers, ['dang thuoc', 'dvt']);

        if (brandIdx === -1) {
          statusEl.textContent = 'Không tìm thấy cột "Tên thương mại"/"Tên biệt dược" trong file.';
          statusEl.className = 'rx-sb-status err';
          return;
        }

        const parsed = rows.slice(1)
          .map((r) => ({
            brand: String(r[brandIdx] || '').trim(),
            generic: genericIdx !== -1 ? String(r[genericIdx] || '').trim() : '',
            form: formIdx !== -1 ? String(r[formIdx] || '').trim() : '',
          }))
          .filter((d) => d.brand);

        const added = await mergeNewDrugs(parsed);
        statusEl.textContent = `✓ Đã nạp ${parsed.length} dòng, thêm mới ${added} thuốc (${parsed.length - added} trùng, đã bỏ qua).`;
        statusEl.className = 'rx-sb-status ok';
        e.target.value = '';
      } catch (err) {
        statusEl.textContent = 'Lỗi đọc file Excel: ' + err.message;
        statusEl.className = 'rx-sb-status err';
      }
    };
    reader.readAsArrayBuffer(file);
  });

  $('rxExcelInputOutside').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const statusEl = $('rxExcelStatusOutside');
    statusEl.textContent = 'Đang đọc file...';
    statusEl.className = 'rx-sb-status';
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        if (rows.length < 2) { statusEl.textContent = 'File rỗng hoặc không đúng định dạng.'; statusEl.className = 'rx-sb-status err'; return; }

        const headers = rows[0].map((h) => String(h || ''));
        const brandIdx = pickCol(headers, ['ten thuong mai', 'ten biet duoc', 'biet duoc', 'ten thuoc - ham luong', 'ten thuoc']);
        const genericIdx = pickCol(headers, ['ten goc', 'hoat chat']);
        const formIdx = pickCol(headers, ['dang thuoc', 'dvt']);

        if (brandIdx === -1) {
          statusEl.textContent = 'Không tìm thấy cột "Tên thương mại"/"Tên biệt dược" trong file.';
          statusEl.className = 'rx-sb-status err';
          return;
        }

        const parsed = rows.slice(1)
          .map((r) => ({
            brand: String(r[brandIdx] || '').trim(),
            generic: genericIdx !== -1 ? String(r[genericIdx] || '').trim() : '',
            form: formIdx !== -1 ? String(r[formIdx] || '').trim() : '',
          }))
          .filter((d) => d.brand);

        const added = mergeNewDrugsOutside(parsed);
        statusEl.textContent = `✓ Đã nạp ${parsed.length} dòng, thêm mới ${added} thuốc (${parsed.length - added} trùng, đã bỏ qua).`;
        statusEl.className = 'rx-sb-status ok';
        e.target.value = '';
      } catch (err) {
        statusEl.textContent = 'Lỗi đọc file Excel: ' + err.message;
        statusEl.className = 'rx-sb-status err';
      }
    };
    reader.readAsArrayBuffer(file);
  });

  $('rxResetOutsideBtn').addEventListener('click', async () => {
    const ok = await customConfirm('Khôi phục danh mục khởi điểm', 'Thao tác này sẽ xoá mọi thuốc đã nạp thêm cho chế độ "Ngoài Bệnh viện" và khôi phục lại danh mục mặc định ban đầu. Tiếp tục?');
    if (!ok) return;
    outsideDrugList = DEFAULT_OUTSIDE_DRUGS.slice();
    saveOutsideDrugList();
    const statusEl = $('rxExcelStatusOutside');
    statusEl.textContent = '✓ Đã khôi phục danh mục khởi điểm.';
    statusEl.className = 'rx-sb-status ok';
  });

  // ---------- Chọn chế độ kê đơn: Trong BV / Ngoài BV / In toa viết tay ----------
  let rxPrescribeMode = localStorage.getItem(LS_RX_MODE) || 'hospital';
  const modeRadios = document.querySelectorAll('input[name="rxPrescribeMode"]');
  const digitalDrugArea = $('rxDigitalDrugArea');
  const handwrittenBox = $('rxHandwrittenBox');

  function activeDrugList() {
    return rxPrescribeMode === 'outside' ? outsideDrugList : drugList;
  }

  function applyModeUI() {
    modeRadios.forEach((r) => {
      r.checked = r.value === rxPrescribeMode;
      const opt = r.closest('.rx-mode-opt');
      if (opt) opt.classList.toggle('active', r.checked);
    });
    const isHandwritten = rxPrescribeMode === 'handwritten';
    digitalDrugArea.style.display = isHandwritten ? 'none' : '';
    handwrittenBox.style.display = isHandwritten ? '' : 'none';
    const sBox = $('rxSuggestBox');
    if (sBox) sBox.classList.remove('show');
  }

  modeRadios.forEach((r) => {
    r.addEventListener('change', () => {
      if (!r.checked) return;
      rxPrescribeMode = r.value;
      localStorage.setItem(LS_RX_MODE, rxPrescribeMode);
      applyModeUI();
    });
  });
  applyModeUI();


  const brandInput = $('rxFieldBrand'), genericInput = $('rxFieldGeneric'), formInput = $('rxFieldForm');
  const suggestBox = $('rxSuggestBox');
  let activeSuggestIndex = -1, currentSuggestList = [];

  function renderSuggest(query) {
    const q = normalize(query);
    if (!q) { suggestBox.classList.remove('show'); return; }
    currentSuggestList = activeDrugList().filter((d) => normalize(d.brand).includes(q) || normalize(d.generic).includes(q)).slice(0, 30);
    activeSuggestIndex = -1;
    if (currentSuggestList.length === 0) {
      suggestBox.innerHTML = '<div class="rx-suggest-empty">Không tìm thấy thuốc phù hợp trong danh sách đã nạp.</div>';
    } else {
      suggestBox.innerHTML = currentSuggestList.map((d, i) =>
        `<div class="rx-suggest-item" data-idx="${i}"><b>${escapeHtml(d.brand)}</b><span class="g">${escapeHtml(d.generic)}${d.form ? ' — ' + escapeHtml(d.form) : ''}</span></div>`
      ).join('');
    }
    suggestBox.classList.add('show');
  }

  // ---------- Tự động gợi ý "Cách dùng" theo tên thuốc ----------
  // Trả về chuỗi cách dùng phù hợp nhất, hoặc '' nếu không khớp quy tắc nào đặc biệt (dùng mặc định "Uống sau khi ăn")
  const USAGE_RULES = [
    // Kim châm cứu / dụng cụ châm cứu - không phải thuốc uống
    {
      test: (s) => /cham cuu|kim cham/.test(s),
      usage: 'Châm cứu theo chỉ định của bác sĩ',
    },
    // Smecta / diosmectit - uống xa bữa ăn, xa các thuốc khác
    {
      test: (s) => /\bsmecta\b/.test(s) || /diosmectit|dioctahedral smectit/.test(s),
      usage: 'Uống xa bữa ăn (cách xa thức ăn và các thuốc khác ít nhất 2 giờ)',
    },
    // Thuốc chứa Sắt - uống sáng lúc đói
    {
      test: (s) => /\bsat\b/.test(s) || /\bferrous\b|\bferric\b|fumarat sat|sulfat sat|gluconat sat/.test(s),
      usage: 'Uống buổi sáng lúc đói, uống nhiều nước, không nằm ngay sau khi uống',
    },
    // Ức chế bơm proton (PPI) và Gliclazide - uống trước ăn
    {
      test: (s) => /prazol/.test(s) || /gliclazide/.test(s),
      usage: 'Uống trước khi ăn 30 phút',
    },
    // Thuốc kháng acid dạng "sữa dạ dày" - uống sau ăn 1-3 giờ
    {
      test: (s) => /phosphalugel|yumangel|gastropulgite|maalox|gaviscon|varogel|trimafort|susergel|nhom hydroxit|nhom hydroxyd|magnesi hydroxit|thuoc sua da day/.test(s),
      usage: 'Uống sau ăn 1-3 giờ',
    },
    // Viên nhai (canxi nhai, vitamin nhai...)
    {
      test: (s) => /\bnhai\b|chewable/.test(s),
      usage: 'Nhai kỹ trước khi nuốt, uống sau khi ăn',
    },
  ];
  const DEFAULT_USAGE = 'Uống sau khi ăn';

  function suggestUsage(brand, generic) {
    const s = normalize(`${brand} ${generic}`);
    for (const rule of USAGE_RULES) {
      if (rule.test(s)) return rule.usage;
    }
    return DEFAULT_USAGE;
  }

  function autoFillUsage(brand, generic) {
    const usageInput = $('rxFieldUsage');
    if (!usageInput.value.trim() && (brand || generic)) {
      usageInput.value = suggestUsage(brand, generic);
    }
  }

  let brandLinked = false;
  function pickSuggest(d) {
    brandInput.value = d.brand;
    genericInput.value = d.generic;
    formInput.value = d.form || '';
    suggestBox.classList.remove('show');
    autoFillUsage(d.brand, d.generic);
    brandLinked = true;
    $('rxFieldDays').focus();
    $('rxFieldDays').select();
  }

  // Nếu người dùng gõ tay tên thuốc (không chọn từ gợi ý) thì vẫn tự điền cách dùng khi rời ô
  brandInput.addEventListener('blur', () => {
    if (!suggestBox.classList.contains('show')) autoFillUsage(brandInput.value, genericInput.value);
  });

  brandInput.addEventListener('input', () => { brandLinked = false; renderSuggest(brandInput.value); });
  brandInput.addEventListener('focus', () => { if (brandInput.value) renderSuggest(brandInput.value); });
  document.addEventListener('click', (e) => { if (!e.target.closest('.rx-autocomplete-wrap')) suggestBox.classList.remove('show'); });

  suggestBox.addEventListener('click', (e) => {
    const item = e.target.closest('.rx-suggest-item');
    if (item && currentSuggestList[item.dataset.idx]) pickSuggest(currentSuggestList[item.dataset.idx]);
  });

  // ---------- Enter chuyển ô, tự tính SL, ô cuối Enter -> thêm dòng ----------
  // "Tên gốc, Hoạt chất" chỉ để hiển thị/đối chiếu tự động, không cho gõ tay
  genericInput.setAttribute('readonly', 'readonly');
  genericInput.setAttribute('tabindex', '-1');
  genericInput.placeholder = 'Tự động điền và đối chiếu khi chọn thuốc';

  // Bấm Enter ở "Tên thương mại" (khi không chọn gợi ý) sẽ nhảy thẳng tới "Ngày", bỏ qua Tên gốc/Dạng thuốc/Cách dùng
  const NEXT_FIELD = {
    rxFieldBrand: 'rxFieldDays',
    rxFieldForm: 'rxFieldUsage',
    rxFieldUsage: 'rxFieldDays',
    rxFieldDays: 'rxFieldMorning',
    rxFieldMorning: 'rxFieldNoon',
    rxFieldNoon: 'rxFieldAfternoon',
    rxFieldAfternoon: 'rxFieldEvening',
    rxFieldEvening: 'rxFieldQty',
  };
  const ENTER_NAV_FIELDS = ['rxFieldBrand', 'rxFieldForm', 'rxFieldUsage', 'rxFieldDays', 'rxFieldMorning', 'rxFieldNoon', 'rxFieldAfternoon', 'rxFieldEvening', 'rxFieldQty'];
  const CLEAR_ON_NEW_ROW_FIELDS = ['rxFieldBrand', 'rxFieldGeneric', 'rxFieldForm', 'rxFieldUsage', 'rxFieldDays', 'rxFieldMorning', 'rxFieldNoon', 'rxFieldAfternoon', 'rxFieldEvening', 'rxFieldQty'];

  function recomputeQty() {
    const days = parseFloat($('rxFieldDays').value) || 0;
    const m = parseFloat($('rxFieldMorning').value) || 0;
    const n = parseFloat($('rxFieldNoon').value) || 0;
    const a = parseFloat($('rxFieldAfternoon').value) || 0;
    const ev = parseFloat($('rxFieldEvening').value) || 0;
    const total = (m + n + a + ev) * days;
    if (total > 0) $('rxFieldQty').value = Number.isInteger(total) ? total : total.toFixed(1);
  }
  ['rxFieldDays', 'rxFieldMorning', 'rxFieldNoon', 'rxFieldAfternoon', 'rxFieldEvening'].forEach((id) => {
    $(id).addEventListener('input', recomputeQty);
  });

  ENTER_NAV_FIELDS.forEach((id, fieldIdx) => {
    $(id).addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && $(id).value === '' && fieldIdx > 0) {
        e.preventDefault();
        const prevId = ENTER_NAV_FIELDS[fieldIdx - 1];
        focusAndSelect($(prevId));
        return;
      }
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (id === 'rxFieldBrand' && suggestBox.classList.contains('show')) {
        if (activeSuggestIndex >= 0 && currentSuggestList[activeSuggestIndex]) {
          pickSuggest(currentSuggestList[activeSuggestIndex]);
          return;
        }
        suggestBox.classList.remove('show');
      }
      // Ô "Tên thương mại" chưa liên kết được với thuốc trong danh sách: khoá con trỏ tại đây khi Enter
      // (chỉ Tab mới cho qua) -- TRỪ chế độ "Kê đơn ngoài Bệnh viện", vì chế độ này cho gõ tự do
      // (thuốc không có sẵn trong danh mục vẫn cần xuống được đơn).
      if (id === 'rxFieldBrand' && !brandLinked && rxPrescribeMode !== 'outside') {
        return;
      }
      // Ô "Ngày" chưa nhập số: khoá con trỏ tại đây khi Enter
      if (id === 'rxFieldDays' && $('rxFieldDays').value.trim() === '') {
        return;
      }
      const nextId = NEXT_FIELD[id];
      if (nextId) {
        $(nextId).focus();
        $(nextId).select && $(nextId).select();
      } else {
        addRxRow();
      }
    });
    if (id === 'rxFieldBrand') {
      $(id).addEventListener('keydown', (e) => {
        if (!suggestBox.classList.contains('show')) return;
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          activeSuggestIndex = Math.min(activeSuggestIndex + 1, currentSuggestList.length - 1);
          updateSuggestActive();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          activeSuggestIndex = activeSuggestIndex <= 0 ? currentSuggestList.length - 1 : activeSuggestIndex - 1;
          updateSuggestActive();
        }
      });
    }
  });

  function updateSuggestActive() {
    const items = [...suggestBox.querySelectorAll('.rx-suggest-item')];
    items.forEach((el, i) => el.classList.toggle('active', i === activeSuggestIndex));
    if (activeSuggestIndex >= 0 && items[activeSuggestIndex]) items[activeSuggestIndex].scrollIntoView({ block: 'nearest' });
  }

  function clearRxForm() {
    CLEAR_ON_NEW_ROW_FIELDS.forEach((id) => { $(id).value = ''; });
    brandLinked = false;
    brandInput.focus();
  }

  let dupWarnTimer = null;
  function showDupWarning() {
    const el = $('rxDupWarning');
    el.classList.add('show');
    clearTimeout(dupWarnTimer);
    dupWarnTimer = setTimeout(() => el.classList.remove('show'), 3000);
  }

  function addRxRow() {
    const brand = brandInput.value.trim();
    if (!brand) { brandInput.focus(); return; }
    const generic = genericInput.value.trim();
    const isDup = rxRows.some((r) => normalize(r.brand) === normalize(brand) && normalize(r.generic) === normalize(generic));
    if (isDup) {
      showDupWarning();
      return;
    }
    const row = {
      brand,
      generic,
      form: formInput.value.trim(),
      usage: $('rxFieldUsage').value.trim() || suggestUsage(brand, generic),
      days: $('rxFieldDays').value.trim(),
      morning: $('rxFieldMorning').value.trim() || '0',
      noon: $('rxFieldNoon').value.trim() || '0',
      afternoon: $('rxFieldAfternoon').value.trim() || '0',
      evening: $('rxFieldEvening').value.trim() || '0',
      qty: $('rxFieldQty').value.trim(),
    };
    rxRows.push(row);
    renderRxTable();
    clearRxForm();
    checkInteractionsAfterAdd();
  }

  $('rxAddBtn').addEventListener('click', addRxRow);

  // ======================================================================
  // PHẦN 5: CẢNH BÁO TƯƠNG TÁC THUỐC + BẢNG TOA THUỐC
  // ======================================================================
  // ---------- Cảnh báo tương tác / tương kỵ thuốc ----------
  // Mỗi thuốc trong toa được quy về chuỗi normalize(brand + ' ' + generic) để so khớp từ khóa.
  function drugText(row) { return normalize(`${row.brand} ${row.generic}`); }

  // Quy tắc tương tác thuốc - thuốc (kiểm tra giữa mọi cặp thuốc trong toa)
  const DRUG_DRUG_RULES = [
    {
      a: (s) => /warfarin/.test(s),
      b: (s) => /\baspirin\b|acid acetylsalicylic|nsaid|ibuprofen|diclofenac|meloxicam/.test(s),
      msg: 'Warfarin + Aspirin/NSAID: tăng nguy cơ xuất huyết nghiêm trọng.',
    },
    {
      a: (s) => /atorvastatin|simvastatin|rosuvastatin|statin/.test(s),
      b: (s) => /clarithromycin|erythromycin|itraconazol|ketoconazol/.test(s),
      msg: 'Statin + Kháng sinh nhóm Macrolid/kháng nấm Azol: tăng nguy cơ tiêu cơ vân (rhabdomyolysis).',
    },
    {
      a: (s) => /enalapril|captopril|lisinopril|perindopril|losartan|valsartan|telmisartan/.test(s),
      b: (s) => /spironolacton|kali clorua|kcl\b/.test(s),
      msg: 'Ức chế men chuyển/ARB + Spironolacton/Kali: tăng nguy cơ tăng Kali máu.',
    },
    {
      a: (s) => /doxycyclin|tetracyclin|ciprofloxacin|levofloxacin|moxifloxacin/.test(s),
      b: (s) => /\bsat\b|ferrous|calci|canxi|nhom hydroxit|magnesi hydroxit/.test(s),
      msg: 'Kháng sinh Tetracyclin/Quinolon + Sắt/Canxi/thuốc kháng acid: giảm hấp thu kháng sinh, nên uống cách xa nhau ≥ 2 giờ.',
    },
    {
      a: (s) => /gliclazide|glimepirid|glibenclamid/.test(s),
      b: (s) => /insulin/.test(s),
      msg: 'Sulfonylure + Insulin: tăng nguy cơ hạ đường huyết, cần theo dõi sát.',
    },
    {
      a: (s) => /domperidon/.test(s),
      b: (s) => /erythromycin|clarithromycin|ketoconazol|itraconazol/.test(s),
      msg: 'Domperidon + thuốc ức chế CYP3A4 mạnh: tăng nguy cơ kéo dài khoảng QT, loạn nhịp tim.',
    },
  ];

  // Quy tắc tương kỵ theo chẩn đoán (kiểm tra chẩn đoán hiện tại với từng thuốc trong toa)
  const DIAGNOSIS_DRUG_RULES = [
    {
      diag: (s) => /hen\b|hen phe quan|hen suyen|copd|benh phoi tac nghen/.test(s),
      drug: (s) => /propranolol|beta.?blocker|atenolol(?!.*chon loc)/.test(s) || /propranolol/.test(s),
      msg: 'Chẩn đoán Hen/COPD + chẹn Beta không chọn lọc (Propranolol...): có thể gây co thắt phế quản.',
    },
    {
      diag: (s) => /loet da day|viem loet da day|xuat huyet tieu hoa/.test(s),
      drug: (s) => /aspirin|ibuprofen|diclofenac|meloxicam|nsaid/.test(s),
      msg: 'Chẩn đoán loét/xuất huyết dạ dày + NSAID (Aspirin, Ibuprofen, Diclofenac...): tăng nguy cơ xuất huyết tiêu hoá.',
    },
    {
      diag: (s) => /suy than|suy giam chuc nang than/.test(s),
      drug: (s) => /metformin/.test(s),
      msg: 'Chẩn đoán suy thận + Metformin: tăng nguy cơ nhiễm toan lactic, cần đánh giá mức lọc cầu thận.',
    },
    {
      diag: (s) => /suy than|suy giam chuc nang than/.test(s),
      drug: (s) => /nsaid|ibuprofen|diclofenac|meloxicam/.test(s),
      msg: 'Chẩn đoán suy thận + NSAID: có thể làm nặng thêm tổn thương thận.',
    },
    {
      diag: (s) => /co thai|thai ky|mang thai/.test(s),
      drug: (s) => /warfarin|isotretinoin|misoprostol|statin|atorvastatin|simvastatin/.test(s),
      msg: 'Chẩn đoán có thai + thuốc chống chỉ định thai kỳ (Warfarin, Isotretinoin, Statin...): nguy cơ dị tật/sảy thai.',
    },
  ];

  function collectWarnings() {
    const warnings = [];
    const texts = rxRows.map((r) => ({ row: r, s: drugText(r) }));
    for (let i = 0; i < texts.length; i++) {
      for (let j = i + 1; j < texts.length; j++) {
        for (const rule of DRUG_DRUG_RULES) {
          const hit = (rule.a(texts[i].s) && rule.b(texts[j].s)) || (rule.a(texts[j].s) && rule.b(texts[i].s));
          if (hit) warnings.push(`<b>${escapeHtml(texts[i].row.brand)}</b> + <b>${escapeHtml(texts[j].row.brand)}</b>: ${rule.msg}`);
        }
      }
    }
    const diagS = normalize($('rxDiagnosis').value);
    if (diagS) {
      for (const { row, s } of texts) {
        for (const rule of DIAGNOSIS_DRUG_RULES) {
          if (rule.diag(diagS) && rule.drug(s)) {
            warnings.push(`Chẩn đoán + <b>${escapeHtml(row.brand)}</b>: ${rule.msg}`);
          }
        }
      }
    }
    return warnings;
  }

  const warnOverlay = $('rxWarnOverlay'), warnList = $('rxWarnList');
  function showWarnModal(warnings) {
    warnList.innerHTML = warnings.map((w) => `<li>${w}</li>`).join('');
    warnOverlay.classList.add('show');
  }
  function hideWarnModal() { warnOverlay.classList.remove('show'); }

  $('rxWarnOkBtn').addEventListener('click', hideWarnModal);
  $('rxWarnDelBtn').addEventListener('click', () => {
    if (rxRows.length > 0) { rxRows.pop(); renderRxTable(); }
    hideWarnModal();
  });

  function checkInteractionsAfterAdd() {
    const warnings = collectWarnings();
    if (warnings.length > 0) showWarnModal(warnings);
  }

  // Kiểm tra lại khi chẩn đoán thay đổi (so với các thuốc đã có sẵn trong toa)
  $('rxDiagnosis').addEventListener('blur', () => {
    const warnings = collectWarnings();
    if (warnings.length > 0) {
      warnList.innerHTML = warnings.map((w) => `<li>${w}</li>`).join('');
      $('rxWarnDelBtn').style.display = 'none';
      warnOverlay.classList.add('show');
    }
  });
  $('rxWarnOkBtn').addEventListener('click', () => { $('rxWarnDelBtn').style.display = ''; });

  const DOSE_FIELDS = ['usage', 'days', 'morning', 'noon', 'afternoon', 'evening', 'qty'];
  function renderRxTable() {
    const body = $('rxTableBody');
    const emptyMsg = $('rxEmptyMsg');
    const tableWrap = document.querySelector('.rx-table-wrap');
    if (rxRows.length === 0) {
      body.innerHTML = '';
      emptyMsg.classList.add('show');
      if (tableWrap) tableWrap.classList.remove('has-rows');
      updateAutoNote();
      return;
    }
    emptyMsg.classList.remove('show');
    if (tableWrap) tableWrap.classList.add('has-rows');
    body.innerHTML = rxRows.map((r, i) => `
      <tr draggable="true" data-idx="${i}">
        <td class="rx-idx-cell">
          <span class="rx-drag-handle" title="Kéo để sắp xếp lại">⠿</span><span>${i + 1}</span>
          <span class="rx-row-move">
            <button type="button" class="rx-move-up" data-idx="${i}" title="Lên" ${i === 0 ? 'disabled' : ''}>▲</button>
            <button type="button" class="rx-move-down" data-idx="${i}" title="Xuống" ${i === rxRows.length - 1 ? 'disabled' : ''}>▼</button>
          </span>
        </td>
        <td class="rx-truncate-cell" title="${escapeHtml(r.brand)}">${escapeHtml(r.brand)}</td>
        <td class="rx-truncate-cell" title="${escapeHtml(r.generic)}">${escapeHtml(r.generic)}</td>
        <td>${escapeHtml(r.form)}</td>
        <td class="rx-edit-cell" data-idx="${i}" data-field="usage" title="Double-click để sửa">${escapeHtml(r.usage)}</td>
        <td class="rx-edit-cell" data-idx="${i}" data-field="days" title="Double-click để sửa">${escapeHtml(r.days)}</td>
        <td class="rx-edit-cell" data-idx="${i}" data-field="morning" title="Double-click để sửa">${escapeHtml(r.morning)}</td>
        <td class="rx-edit-cell" data-idx="${i}" data-field="noon" title="Double-click để sửa">${escapeHtml(r.noon)}</td>
        <td class="rx-edit-cell" data-idx="${i}" data-field="afternoon" title="Double-click để sửa">${escapeHtml(r.afternoon)}</td>
        <td class="rx-edit-cell" data-idx="${i}" data-field="evening" title="Double-click để sửa">${escapeHtml(r.evening)}</td>
        <td class="rx-edit-cell" data-idx="${i}" data-field="qty" title="Double-click để sửa">${escapeHtml(r.qty)}</td>
        <td class="rx-del-cell"><button class="rx-row-del" data-idx="${i}" title="Xoá">✕</button></td>
      </tr>`).join('');
    updateAutoNote();
  }

  // Sửa nhanh từng ô (Cách dùng/Ngày/Sáng/Trưa/Chiều/Tối/Số lượng) bằng double-click, không cần xoá thuốc
  function recalcQtyForRow(r) {
    const days = parseFloat(r.days) || 0;
    const m = parseFloat(r.morning) || 0;
    const n = parseFloat(r.noon) || 0;
    const a = parseFloat(r.afternoon) || 0;
    const ev = parseFloat(r.evening) || 0;
    const total = (m + n + a + ev) * days;
    if (total > 0) r.qty = Number.isInteger(total) ? String(total) : total.toFixed(1);
  }
  $('rxTableBody').addEventListener('dblclick', (e) => {
    const cell = e.target.closest('.rx-edit-cell');
    if (!cell || cell.querySelector('input')) return;
    const idx = parseInt(cell.dataset.idx, 10);
    const field = cell.dataset.field;
    const r = rxRows[idx];
    if (!r) return;
    const oldValue = r[field] || '';
    const isNumeric = field !== 'usage';
    cell.innerHTML = `<input type="${isNumeric ? 'number' : 'text'}" ${isNumeric ? 'step="1" min="0"' : ''} class="rx-edit-cell-input" value="${escapeHtml(oldValue)}">`;
    const input = cell.querySelector('input');
    input.focus();
    input.select();
    let done = false;
    function commit() {
      if (done) return;
      done = true;
      const newVal = input.value.trim();
      r[field] = newVal;
      if (field !== 'qty' && field !== 'usage') recalcQtyForRow(r);
      renderRxTable();
    }
    function cancel() {
      if (done) return;
      done = true;
      renderRxTable();
    }
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (ev2) => {
      if (ev2.key === 'Enter') { ev2.preventDefault(); commit(); }
      else if (ev2.key === 'Escape') { ev2.preventDefault(); cancel(); }
    });
  });

  function moveRow(from, to) {
    if (to < 0 || to >= rxRows.length || from === to) return;
    const [item] = rxRows.splice(from, 1);
    rxRows.splice(to, 0, item);
    renderRxTable();
  }

  $('rxTableBody').addEventListener('click', (e) => {
    const delBtn = e.target.closest('.rx-row-del');
    if (delBtn) { rxRows.splice(parseInt(delBtn.dataset.idx, 10), 1); renderRxTable(); return; }
    const upBtn = e.target.closest('.rx-move-up');
    if (upBtn) { moveRow(parseInt(upBtn.dataset.idx, 10), parseInt(upBtn.dataset.idx, 10) - 1); return; }
    const downBtn = e.target.closest('.rx-move-down');
    if (downBtn) { moveRow(parseInt(downBtn.dataset.idx, 10), parseInt(downBtn.dataset.idx, 10) + 1); return; }
  });

  // ---------- Kéo thả để sắp xếp lại thứ tự thuốc trong toa ----------
  let dragFromIdx = null;
  $('rxTableBody').addEventListener('dragstart', (e) => {
    const tr = e.target.closest('tr');
    if (!tr) return;
    dragFromIdx = parseInt(tr.dataset.idx, 10);
    tr.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });
  $('rxTableBody').addEventListener('dragend', (e) => {
    const tr = e.target.closest('tr');
    if (tr) tr.classList.remove('dragging');
    [...$('rxTableBody').querySelectorAll('tr')].forEach((row) => row.classList.remove('drag-over'));
  });
  $('rxTableBody').addEventListener('dragover', (e) => {
    e.preventDefault();
    const tr = e.target.closest('tr');
    if (!tr) return;
    [...$('rxTableBody').querySelectorAll('tr')].forEach((row) => row.classList.remove('drag-over'));
    tr.classList.add('drag-over');
  });
  $('rxTableBody').addEventListener('drop', (e) => {
    e.preventDefault();
    const tr = e.target.closest('tr');
    if (!tr || dragFromIdx === null) return;
    const toIdx = parseInt(tr.dataset.idx, 10);
    moveRow(dragFromIdx, toIdx);
    dragFromIdx = null;
  });


  $('rxClearBtn').addEventListener('click', async () => {
    if (rxRows.length === 0) return;
    const ok = await customConfirm('Xoá toàn bộ thuốc', 'Xoá toàn bộ thuốc đang có trong toa?');
    if (ok) { rxRows = []; renderRxTable(); }
  });

  // ---------- Ngày mặc định ----------
  $('rxDate').value = todayLocalISO();

  // ======================================================================
  // PHẦN 6: THÔNG TIN BỆNH NHÂN (tuổi, họ tên, lời dặn tái khám)
  // ======================================================================
  // ---------- Tuổi tự tính từ ngày sinh ----------
  function calcAge(dobStr) {
    if (!dobStr) return null;
    const dob = new Date(dobStr);
    if (isNaN(dob.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
    return age >= 0 ? age : null;
  }
  // ---------- Họ và tên bệnh nhân luôn hiển thị/lưu dạng viết hoa ----------
  const nameInput = $('rxPatientName');
  nameInput.addEventListener('input', () => {
    const start = nameInput.selectionStart, end = nameInput.selectionEnd;
    nameInput.value = nameInput.value.toUpperCase();
    try { nameInput.setSelectionRange(start, end); } catch (e) {}
  });

  const dobInput = $('rxPatientDob'), ageHint = $('rxPatientAgeHint');
  dobInput.addEventListener('input', () => {
    const age = calcAge(dobInput.value);
    ageHint.textContent = age !== null ? `Tuổi: ${age}` : '';
  });

  // ---------- Tự động điền "Lời dặn của bác sĩ": Tái khám {thứ} ngày {dd/mm/yyyy} ----------
  const noteInput = $('rxNote');
  const WEEKDAYS_VN = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  let lastAutoNote = '';
  function buildAutoNote() {
    const maxDays = rxRows.reduce((max, r) => Math.max(max, parseInt(r.days, 10) || 0), 0);
    if (maxDays <= 0) return '';
    const target = new Date();
    target.setDate(target.getDate() + maxDays);
    const dd = String(target.getDate()).padStart(2, '0');
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    const yyyy = target.getFullYear();
    const weekday = WEEKDAYS_VN[target.getDay()];
    return `Tái khám ${weekday} ngày ${dd}/${mm}/${yyyy} hoặc khi có triệu chứng bất thường`;
  }
  function updateAutoNote() {
    const suggestion = buildAutoNote();
    // Chỉ tự điền nếu ô đang trống hoặc đang chứa đúng gợi ý tự động lần trước (không ghi đè nội dung người dùng tự gõ)
    if (!noteInput.value.trim() || noteInput.value === lastAutoNote) {
      noteInput.value = suggestion;
      lastAutoNote = suggestion;
    }
  }
  noteInput.addEventListener('input', () => {
    if (noteInput.value !== lastAutoNote) lastAutoNote = '__custom__';
  });
  $('rxNoteDelBtn').addEventListener('click', () => {
    noteInput.value = '';
    lastAutoNote = '__custom__';
    noteInput.focus();
  });


  // ======================================================================
  // PHẦN 7: ĐỊA CHỈ HÀNH CHÍNH (tỉnh/xã, autocomplete)
  // ======================================================================
  // ---------- Địa chỉ theo đơn vị hành chính mới (34 tỉnh/thành, 3.321 xã/phường — theo danh sách chính thức) ----------
  const PROVINCE_NAMES = Object.keys(WARD_DATA);
  const addrNewBox = $('rxAddressNewBox');
  const provinceSearch = $('rxProvinceSearch'), provinceSuggest = $('rxProvinceSuggest'), provinceClearBtn = $('rxProvinceClearBtn');
  const wardSearch = $('rxWardSearch'), wardSuggest = $('rxWardSuggest'), wardClearBtn = $('rxWardClearBtn');
  let selectedProvince = '', selectedWard = '';
  let provinceMatches = [], provinceActiveIndex = -1;
  let wardMatches = [], wardActiveIndex = -1;

  function refreshClearBtn(inputEl, btnEl) { btnEl.classList.toggle('show', !!inputEl.value); }

  function makeSuggestList(boxEl, items, activeIndexRef) {
    if (items.length === 0) {
      boxEl.innerHTML = '<div class="rx-suggest-empty">Không tìm thấy kết quả phù hợp.</div>';
    } else {
      boxEl.innerHTML = items.map((name, i) => `<div class="rx-suggest-item" data-idx="${i}">${escapeHtml(name)}</div>`).join('');
    }
    boxEl.classList.add('show');
  }
  function updateActive(boxEl, activeIndex) {
    const items = [...boxEl.querySelectorAll('.rx-suggest-item')];
    items.forEach((el, i) => el.classList.toggle('active', i === activeIndex));
    if (activeIndex >= 0 && items[activeIndex]) items[activeIndex].scrollIntoView({ block: 'nearest' });
  }

  function renderProvinceSuggest(q) {
    const nq = normalize(q);
    provinceActiveIndex = -1;
    provinceMatches = nq ? PROVINCE_NAMES.filter((p) => normalize(p).includes(nq)) : PROVINCE_NAMES;
    makeSuggestList(provinceSuggest, provinceMatches, provinceActiveIndex);
  }
  function pickProvince(name) {
    selectedProvince = name;
    provinceSearch.value = name;
    provinceSuggest.classList.remove('show');
    selectedWard = '';
    wardSearch.value = '';
    wardSearch.disabled = false;
    refreshClearBtn(provinceSearch, provinceClearBtn);
    refreshClearBtn(wardSearch, wardClearBtn);
  }
  provinceSearch.addEventListener('focus', () => renderProvinceSuggest(provinceSearch.value));
  provinceSearch.addEventListener('input', () => {
    if (provinceSearch.value !== selectedProvince) { selectedProvince = ''; selectedWard = ''; wardSearch.value = ''; wardSearch.disabled = true; }
    renderProvinceSuggest(provinceSearch.value);
    refreshClearBtn(provinceSearch, provinceClearBtn);
    refreshClearBtn(wardSearch, wardClearBtn);
  });
  provinceClearBtn.addEventListener('click', () => {
    provinceSearch.value = '';
    selectedProvince = '';
    selectedWard = '';
    wardSearch.value = '';
    wardSearch.disabled = true;
    refreshClearBtn(provinceSearch, provinceClearBtn);
    refreshClearBtn(wardSearch, wardClearBtn);
    provinceSuggest.classList.remove('show');
    provinceSearch.focus();
  });
  provinceSearch.addEventListener('keydown', (e) => {
    if (!provinceSuggest.classList.contains('show')) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      provinceActiveIndex = provinceActiveIndex >= provinceMatches.length - 1 ? 0 : provinceActiveIndex + 1;
      updateActive(provinceSuggest, provinceActiveIndex);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      provinceActiveIndex = provinceActiveIndex <= 0 ? provinceMatches.length - 1 : provinceActiveIndex - 1;
      updateActive(provinceSuggest, provinceActiveIndex);
    } else if (e.key === 'Enter') {
      if (provinceActiveIndex >= 0 && provinceMatches[provinceActiveIndex]) {
        e.preventDefault();
        pickProvince(provinceMatches[provinceActiveIndex]);
      } else {
        provinceSuggest.classList.remove('show');
      }
    } else if (e.key === 'Escape') {
      provinceSuggest.classList.remove('show');
    }
  });
  provinceSuggest.addEventListener('click', (e) => {
    const item = e.target.closest('.rx-suggest-item');
    if (item && provinceMatches[item.dataset.idx]) pickProvince(provinceMatches[item.dataset.idx]);
  });

  function renderWardSuggest(q) {
    const nq = normalize(q);
    wardActiveIndex = -1;
    const wards = WARD_DATA[selectedProvince] || [];
    wardMatches = nq ? wards.filter((w) => normalize(w).includes(nq)) : wards;
    makeSuggestList(wardSuggest, wardMatches, wardActiveIndex);
  }
  function pickWard(name) {
    selectedWard = name;
    wardSearch.value = name;
    wardSuggest.classList.remove('show');
    refreshClearBtn(wardSearch, wardClearBtn);
  }
  wardSearch.addEventListener('focus', () => { if (!wardSearch.disabled) renderWardSuggest(wardSearch.value); });
  wardSearch.addEventListener('input', () => {
    if (wardSearch.value !== selectedWard) selectedWard = '';
    renderWardSuggest(wardSearch.value);
    refreshClearBtn(wardSearch, wardClearBtn);
  });
  wardClearBtn.addEventListener('click', () => {
    wardSearch.value = '';
    selectedWard = '';
    refreshClearBtn(wardSearch, wardClearBtn);
    wardSuggest.classList.remove('show');
    wardSearch.focus();
  });
  wardSearch.addEventListener('keydown', (e) => {
    if (!wardSuggest.classList.contains('show')) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      wardActiveIndex = wardActiveIndex >= wardMatches.length - 1 ? 0 : wardActiveIndex + 1;
      updateActive(wardSuggest, wardActiveIndex);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      wardActiveIndex = wardActiveIndex <= 0 ? wardMatches.length - 1 : wardActiveIndex - 1;
      updateActive(wardSuggest, wardActiveIndex);
    } else if (e.key === 'Enter') {
      if (wardActiveIndex >= 0 && wardMatches[wardActiveIndex]) {
        e.preventDefault();
        pickWard(wardMatches[wardActiveIndex]);
      } else {
        wardSuggest.classList.remove('show');
      }
    } else if (e.key === 'Escape') {
      wardSuggest.classList.remove('show');
    }
  });
  wardSuggest.addEventListener('click', (e) => {
    const item = e.target.closest('.rx-suggest-item');
    if (item && wardMatches[item.dataset.idx]) pickWard(wardMatches[item.dataset.idx]);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#rxProvinceSearch') && !e.target.closest('#rxProvinceSuggest')) provinceSuggest.classList.remove('show');
    if (!e.target.closest('#rxWardSearch') && !e.target.closest('#rxWardSuggest')) wardSuggest.classList.remove('show');
  });

  $('rxAddrNewToggle').addEventListener('change', (e) => {
    addrNewBox.style.display = e.target.checked ? '' : 'none';
  });

  // ---------- Tự động viết hoa toàn bộ địa chỉ khi nhập tay ----------
  $('rxAddress').addEventListener('input', (e) => {
    const el = e.target;
    const pos = el.selectionStart;
    const upper = el.value.toUpperCase();
    if (upper !== el.value) {
      el.value = upper;
      try { el.setSelectionRange(pos, pos); } catch (err) {}
    }
  });

  function getFullAddress() {
    const base = $('rxAddress').value.trim();
    const parts = [base];
    if ($('rxAddrNewToggle').checked) {
      if (selectedWard) parts.push(selectedWard);
      if (selectedProvince) parts.push(selectedProvince);
    }
    return parts.filter(Boolean).join(', ');
  }

  // ======================================================================
  // PHẦN 8: CHẨN ĐOÁN ICD-10 + IN / XUẤT TOA THUỐC
  // ======================================================================
  // ---------- Chẩn đoán theo ICD-10 (dữ liệu đầy đủ nạp trực tiếp từ bsdha.github.io) ----------
  // Nguồn: window.ICD_DATA (~16.146 mã ICD-10 Tây y) và window.ICD_YHCT_DATA (mã Y học cổ truyền, tra chéo sang ICD-10)
  // được nạp qua thẻ script (script src=...) ở đầu file. Nếu vì lý do mạng mà không tải được, dùng danh mục rút gọn dự phòng.
  const FALLBACK_ICD10 = [
    ['I10', 'Tăng huyết áp vô căn (nguyên phát)'], ['E11', 'Đái tháo đường típ 2'],
    ['J18', 'Viêm phổi'], ['K21', 'Trào ngược dạ dày thực quản (GERD)'], ['J45', 'Hen phế quản'],
    ['M54', 'Đau lưng'], ['N39', 'Nhiễm khuẩn đường tiết niệu'], ['J02', 'Viêm họng cấp'],
  ];
  function buildIcdSearchIndex() {
    const list = [];
    if (Array.isArray(window.ICD_DATA)) {
      for (const e of window.ICD_DATA) {
        if (e && e.code && e.name) list.push({ code: e.code, text: e.name, source: '' });
      }
    }
    if (Array.isArray(window.ICD_YHCT_DATA)) {
      for (const e of window.ICD_YHCT_DATA) {
        if (e && e.icd10 && e.modernName) {
          list.push({ code: e.icd10, text: e.modernName, source: `YHCT: ${e.name}` });
        }
      }
    }
    if (list.length === 0) {
      for (const [code, text] of FALLBACK_ICD10) list.push({ code, text, source: '' });
    }
    // Tính sẵn dạng không dấu 1 lần duy nhất để tra cứu nhanh, tránh phải normalize()
    // lại toàn bộ danh sách (~16.000+ mã) ở mỗi phím gõ gây đơ/giật.
    for (const it of list) {
      it.nCode = normalize(it.code);
      it.nText = normalize(it.text);
    }
    return list;
  }
  const ICD_SEARCH_INDEX = buildIcdSearchIndex();
  const diagInput = $('rxDiagnosis'), icdSuggest = $('rxIcdSuggest'), icdToggle = $('rxIcdToggle');
  diagInput.addEventListener('input', (e) => {
    const el = e.target;
    if (!el.value) return;
    const first = el.value.charAt(0);
    const upperFirst = first.toUpperCase();
    if (first !== upperFirst) {
      const pos = el.selectionStart;
      el.value = upperFirst + el.value.slice(1);
      try { el.setSelectionRange(pos, pos); } catch (err) {}
    }
  });
  let icdMatches = [], icdActiveIndex = -1, icdDebounceTimer = null;
  // Thu hẹp dần phạm vi tìm kiếm: nếu từ khoá mới là nối dài của từ khoá cũ,
  // chỉ cần lọc trong tập kết quả (chưa cắt) của lần trước thay vì quét lại
  // toàn bộ ~16.000+ mã ICD-10 từ đầu mỗi lần gõ -> nhanh hơn nhiều khi gõ liên tục.
  let icdPool = ICD_SEARCH_INDEX, icdPoolQuery = '';
  const ICD_MAX_SHOW = 25;
  const ICD_POOL_CAP = 400; // tối đa số mục giữ lại làm "pool" để lọc tiếp cho ký tự sau
  function renderIcdSuggest(q) {
    const nq = normalize(q);
    icdActiveIndex = -1;
    if (!nq || nq.length < 2) {
      icdSuggest.classList.remove('show');
      icdPool = ICD_SEARCH_INDEX; icdPoolQuery = '';
      return;
    }
    const searchIn = (icdPoolQuery && nq.startsWith(icdPoolQuery)) ? icdPool : ICD_SEARCH_INDEX;
    const pool = [];
    const shown = [];
    for (let i = 0; i < searchIn.length; i++) {
      const it = searchIn[i];
      if (it.nCode.includes(nq) || it.nText.includes(nq)) {
        if (shown.length < ICD_MAX_SHOW) shown.push(it);
        if (pool.length < ICD_POOL_CAP) pool.push(it);
      }
    }
    icdMatches = shown;
    icdPool = pool; icdPoolQuery = nq;
    if (icdMatches.length === 0) {
      icdSuggest.innerHTML = '<div class="rx-suggest-empty">Không tìm thấy mã ICD-10 phù hợp.</div>';
    } else {
      icdSuggest.innerHTML = icdMatches.map((it, i) =>
        `<div class="rx-suggest-item" data-idx="${i}"><b>${escapeHtml(it.code)}</b><span class="g">${escapeHtml(it.text)}${it.source ? ' — ' + escapeHtml(it.source) : ''}</span></div>`
      ).join('');
    }
    icdSuggest.classList.add('show');
  }
  function updateIcdActive() {
    const items = [...icdSuggest.querySelectorAll('.rx-suggest-item')];
    items.forEach((el, i) => el.classList.toggle('active', i === icdActiveIndex));
    if (icdActiveIndex >= 0 && items[icdActiveIndex]) items[icdActiveIndex].scrollIntoView({ block: 'nearest' });
  }
  function pickIcd(it) {
    diagInput.value = `${it.code} - ${it.text}`;
    icdSuggest.classList.remove('show');
  }
  diagInput.addEventListener('input', () => {
    if (!icdToggle.checked) return;
    clearTimeout(icdDebounceTimer);
    icdDebounceTimer = setTimeout(() => renderIcdSuggest(diagInput.value), 120);
  });
  diagInput.addEventListener('focus', () => { if (icdToggle.checked && diagInput.value) renderIcdSuggest(diagInput.value); });
  diagInput.addEventListener('keydown', (e) => {
    if (!icdToggle.checked || !icdSuggest.classList.contains('show')) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      icdActiveIndex = icdActiveIndex >= icdMatches.length - 1 ? 0 : icdActiveIndex + 1;
      updateIcdActive();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      icdActiveIndex = icdActiveIndex <= 0 ? icdMatches.length - 1 : icdActiveIndex - 1;
      updateIcdActive();
    } else if (e.key === 'Enter') {
      if (icdActiveIndex >= 0 && icdMatches[icdActiveIndex]) {
        e.preventDefault();
        pickIcd(icdMatches[icdActiveIndex]);
      } else {
        icdSuggest.classList.remove('show');
      }
    } else if (e.key === 'Escape') {
      icdSuggest.classList.remove('show');
    }
  });
  icdSuggest.addEventListener('click', (e) => {
    const item = e.target.closest('.rx-suggest-item');
    if (!item || !icdMatches[item.dataset.idx]) return;
    pickIcd(icdMatches[item.dataset.idx]);
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('#rxDiagnosis') && !e.target.closest('#rxIcdSuggest')) icdSuggest.classList.remove('show'); });
  icdToggle.addEventListener('change', () => {
    diagInput.placeholder = icdToggle.checked ? 'Gõ mã hoặc tên bệnh ICD-10, VD: I10, tang huyet ap...' : 'VD: Tăng huyết áp (I10)';
    icdSuggest.classList.remove('show');
  });

  // ---------- Enter chuyển ô lần lượt trong phần Thông tin bệnh nhân ----------
  function patientFieldOrder() {
    const order = ['rxPatientName', 'rxPatientDob', 'rxPatientSex', 'rxAddress'];
    if ($('rxAddrNewToggle').checked) order.push('rxProvinceSearch', 'rxWardSearch');
    order.push('rxDiagnosis', 'rxVitalPulse', 'rxVitalBpSys', 'rxVitalBpDia', 'rxVitalTemp', 'rxVitalResp', 'rxVitalWeight');
    return order;
  }
  function focusAndSelect(el, preventScroll) {
    if (!el) return;
    if (preventScroll) el.focus({ preventScroll: true });
    else el.focus();
    if (el.select) el.select();
  }
  patientFieldOrder().forEach((id) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener('keydown', (e) => {
      if (e.defaultPrevented) return;
      const order = patientFieldOrder();
      const idx = order.indexOf(id);
      if (idx === -1) return;
      const NO_BACKSPACE_JUMP = ['rxPatientDob', 'rxPatientSex', 'rxAddress', 'rxDiagnosis', 'rxVitalPulse'];
      if (e.key === 'Backspace' && el.tagName !== 'SELECT' && el.value === '' && idx > 0 && !NO_BACKSPACE_JUMP.includes(id)) {
        e.preventDefault();
        focusAndSelect($(order[idx - 1]));
        return;
      }
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (idx < order.length - 1) {
        focusAndSelect($(order[idx + 1]));
      } else {
        focusAndSelect(brandInput, true);
        const panelHead = document.querySelector('#rxDrugPanel .rx-panel-head');
        if (panelHead) panelHead.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ---------- Tạo PDF đơn thuốc (xuất file PDF thật, không dùng cửa sổ in) ----------
  function todayLocalISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  function formatVNDate(str) {
    if (!str) return '';
    const [y, m, d] = str.split('-');
    return `${d}/${m}/${y}`;
  }
  function formatVNDateWords(str) {
    if (!str) return '';
    const [y, m, d] = str.split('-');
    return `Ngày ${d} tháng ${m} năm ${y}`;
  }
  function usageLine(r) {
    const parts = [];
    const unit = unitFromForm(r.form);
    if (parseFloat(r.morning) > 0) parts.push(`Sáng ${r.morning} ${unit}`);
    if (parseFloat(r.noon) > 0) parts.push(`trưa ${r.noon} ${unit}`);
    if (parseFloat(r.afternoon) > 0) parts.push(`chiều ${r.afternoon} ${unit}`);
    if (parseFloat(r.evening) > 0) parts.push(`tối ${r.evening} ${unit}`);
    let dosing = parts.join(', ');
    if (dosing) dosing = dosing.charAt(0).toUpperCase() + dosing.slice(1);
    if (r.days) dosing += (dosing ? ' — ' : '') + `dùng trong ${r.days} ngày`;
    const usage = r.usage ? r.usage.trim() : '';
    if (usage && dosing) return `${usage}: ${dosing}.`;
    if (usage) return `${usage}.`;
    return dosing ? `${dosing}.` : '';
  }

  $('rxPrintBtn').addEventListener('click', async () => {
    const isHandwritten = rxPrescribeMode === 'handwritten';
    if (!isHandwritten && rxRows.length === 0) { customAlert('Chưa có thuốc', 'Toa thuốc chưa có thuốc nào.'); return; }
    const btn = $('rxPrintBtn');
    const originalLabel = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Đang tạo PDF...';

    try {
      const org1 = localStorage.getItem(LS_ORG1) || DEFAULT_ORG1;
      const org2 = localStorage.getItem(LS_ORG2) || DEFAULT_ORG2;
      const logo = currentLogo();
      const doctor = doctorSelect.value || '';
      const name = $('rxPatientName').value.trim();
      const age = calcAge(dobInput.value);
      const sex = $('rxPatientSex').value;
      const diag = $('rxDiagnosis').value.trim();
      const address = getFullAddress();
      const vPulse = $('rxVitalPulse').value.trim();
      const vBpSys = $('rxVitalBpSys').value.trim();
      const vBpDia = $('rxVitalBpDia').value.trim();
      const vBp = (vBpSys || vBpDia) ? `${vBpSys}/${vBpDia}` : '';
      const vTemp = $('rxVitalTemp').value.trim();
      const vResp = $('rxVitalResp').value.trim();
      const vWeight = $('rxVitalWeight').value.trim();
      const vitalsParts = [];
      if (vPulse) vitalsParts.push(`Mạch: ${vPulse} lần/phút`);
      if (vBp) vitalsParts.push(`Huyết áp: ${vBp} mmHg`);
      if (vTemp) vitalsParts.push(`Nhiệt độ: ${vTemp}°C`);
      if (vResp) vitalsParts.push(`Nhịp thở: ${vResp} lần/phút`);
      if (vWeight) vitalsParts.push(`Cân nặng: ${vWeight} kg`);
      const note = $('rxNote').value.trim();
      const dateWords = formatVNDateWords($('rxDate').value) || formatVNDateWords(todayLocalISO());
      const blankDateSign = isHandwritten && !!$('rxHandwrittenBlankDate') && $('rxHandwrittenBlankDate').checked;

      // ---------- Tạo PDF bằng văn bản thật (vector, nhẹ, sắc nét, copy được chữ) ----------
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit: 'mm', format: 'a5', compress: true });
      pdf.addFileToVFS('Roboto-Regular.ttf', PDF_FONT_REGULAR_B64);
      pdf.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
      pdf.addFileToVFS('Roboto-Bold.ttf', PDF_FONT_BOLD_B64);
      pdf.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
      pdf.setFont('Roboto', 'normal');

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const marginX = 12;
      const marginBottom = 12;
      const contentWidth = pageWidth - marginX * 2;
      let y = 12;

      function ensureSpace(h) {
        if (y + h > pageHeight - marginBottom) {
          pdf.addPage();
          y = 12;
        }
      }
      function setF(style, size) { pdf.setFont('Roboto', style); pdf.setFontSize(size); }
      function textAt(str, x, yy, opts) { if (str) pdf.text(str, x, yy, opts); }
      function wrapped(str, maxW) { return pdf.splitTextToSize(str, maxW); }
      function writeParagraph(str, x, maxW, lineH, style, size) {
        setF(style, size);
        const lines = wrapped(str, maxW);
        lines.forEach((ln) => { ensureSpace(lineH); textAt(ln, x, y); y += lineH; });
      }
      function sectionHeader(str) {
        ensureSpace(8);
        setF('bold', 11.5);
        textAt(str, marginX, y);
        const w = pdf.getTextWidth(str);
        pdf.setDrawColor(17, 17, 17);
        pdf.setLineWidth(0.25);
        pdf.line(marginX, y + 1.3, marginX + w, y + 1.3);
        y += 6.5;
      }
      // Đường chấm để trống cho bác sĩ điền tay (thay cho gạch chân liền nét)
      function dottedBlank(x, yy, w, size) {
        if (w <= 0) return;
        setF('normal', size);
        // Đặt từng dấu chấm cách đều theo khoảng cách cố định (mm), không phụ thuộc
        // khoảng trắng mặc định của font, để chấm dày và đều như trong Word.
        const pitch = 1.1; // mm giữa 2 dấu chấm liên tiếp
        const count = Math.max(1, Math.floor(w / pitch) + 1);
        for (let i = 0; i < count; i++) {
          textAt('.', x + i * pitch, yy);
        }
      }

      // Header: logo + 2 dòng tên cơ quan (vị trí & kích thước lấy từ khung xem trước có thể kéo-thả)
      const logoPos = currentLogoPos();
      const logoWmm = logo ? Math.max(6, Math.min(40, logoPos.size)) : 0;
      const logoX = logoPos.x;
      const logoY = logoPos.y;
      let orgTextX = marginX;
      if (logo) {
        try {
          const logoFormat = /^data:image\/jpe?g/i.test(logo) ? 'JPEG' : 'PNG';
          pdf.addImage(logo, logoFormat, logoX, logoY, logoWmm, logoWmm);
        } catch (e) { /* bỏ qua nếu logo lỗi định dạng */ }
        orgTextX = logoX + logoWmm + 4;
      }
      setF('bold', 10.5);
      textAt((org1 || '').toUpperCase(), orgTextX, logoY + 5);
      setF('bold', 11);
      textAt((org2 || '').toUpperCase(), orgTextX, logoY + 10);
      y = Math.max(y, logoY + Math.max(logo ? logoWmm : 0, 12));

      // Tiêu đề
      y += 4;
      setF('bold', 15.5);
      const title = 'ĐƠN THUỐC DỊCH VỤ';
      const titleW = pdf.getTextWidth(title);
      textAt(title, (pageWidth - titleW) / 2, y);
      y += 8;

      // I. Thông tin bệnh nhân
      sectionHeader('I. THÔNG TIN BỆNH NHÂN:');
      if (isHandwritten) {
        // Toa in tay: để trống toàn bộ (chỉ in nhãn + chấm chấm) cho bác sĩ tự ghi
        function blankField(label, x, w) {
          setF('bold', 10.5);
          textAt(label, x, y);
          const lx = x + pdf.getTextWidth(label);
          dottedBlank(lx, y, x + w - lx, 10.5);
        }
        blankField('Họ và tên: ', marginX, contentWidth);
        y += 7.5;
        const halfW = contentWidth / 2;
        blankField('Năm sinh: ', marginX, halfW - 6);
        blankField('Giới tính: ', marginX + halfW, halfW);
        y += 7.5;
        blankField('Địa chỉ: ', marginX, contentWidth);
        y += 7.5;
        blankField('Chẩn đoán: ', marginX, contentWidth);
        y += 7.5;
      } else {
      setF('bold', 10.5);
      const line1Label = 'Họ và tên: ';
      textAt(line1Label, marginX, y);
      let cx = marginX + pdf.getTextWidth(line1Label);
      setF('normal', 10.5);
      textAt(name, cx, y);
      cx += pdf.getTextWidth(name) + 6;
      setF('bold', 10.5);
      textAt('Tuổi: ', cx, y);
      cx += pdf.getTextWidth('Tuổi: ');
      setF('normal', 10.5);
      textAt(age !== null ? String(age) : '', cx, y);
      cx += pdf.getTextWidth(age !== null ? String(age) : '') + 6;
      setF('bold', 10.5);
      textAt('Giới tính: ', cx, y);
      cx += pdf.getTextWidth('Giới tính: ');
      setF('normal', 10.5);
      textAt(sex, cx, y);
      y += 5.5;

      if (address) {
        setF('bold', 10.5);
        textAt('Địa chỉ: ', marginX, y);
        const lbl = pdf.getTextWidth('Địa chỉ: ');
        setF('normal', 10.5);
        const lines = wrapped(address, contentWidth - lbl);
        textAt(lines[0], marginX + lbl, y);
        y += 5;
        for (let i = 1; i < lines.length; i++) { ensureSpace(5); textAt(lines[i], marginX, y); y += 5; }
      }

      if (vitalsParts.length) {
        setF('normal', 9.5);
        let vx = marginX;
        const gap = 5;
        vitalsParts.forEach((p) => {
          const w = pdf.getTextWidth(p);
          if (vx + w > marginX + contentWidth) { vx = marginX; y += 4.8; ensureSpace(4.8); }
          textAt(p, vx, y);
          vx += w + gap;
        });
        y += 6;
      }

      if (diag) {
        setF('bold', 10.5);
        textAt('Chẩn đoán: ', marginX, y);
        const lbl = pdf.getTextWidth('Chẩn đoán: ');
        setF('normal', 10.5);
        const lines = wrapped(diag, contentWidth - lbl);
        textAt(lines[0], marginX + lbl, y);
        y += 5;
        for (let i = 1; i < lines.length; i++) { ensureSpace(5); textAt(lines[i], marginX, y); y += 5; }
      }
      }

      // II. Thông tin đơn thuốc
      y += 2;
      if (isHandwritten) {
        sectionHeader('II. THÔNG TIN ĐƠN THUỐC:');
        const numLines = Math.max(3, Math.min(12, parseInt($('rxHandwrittenLines').value, 10) || 6));
        const prefixLabel = 'Uống trước/sau khi ăn: ';
        const segLabels = ['Sáng', 'Trưa', 'Chiều', 'Tối'];
        setF('normal', 9);
        const prefixW = pdf.getTextWidth(prefixLabel) + 2;
        const segAreaW = contentWidth - prefixW;
        const segW = segAreaW / 4;
        for (let i = 1; i <= numLines; i++) {
          ensureSpace(13);
          // Dòng 1: số thứ tự + đường chấm trống để ghi tên thuốc
          setF('bold', 10.5);
          const numStr = `${i}.`;
          textAt(numStr, marginX, y);
          const numW = pdf.getTextWidth(numStr) + 2;
          dottedBlank(marginX + numW, y, contentWidth - numW, 10.5);
          y += 6.5;
          // Dòng 2: "Uống trước/sau khi ăn" + nhãn Sáng/Trưa/Chiều/Tối + đường chấm ngắn để điền số lượng
          setF('normal', 9);
          textAt(prefixLabel, marginX, y);
          segLabels.forEach((lbl, idx) => {
            const lx = marginX + prefixW + idx * segW;
            textAt(lbl, lx, y);
            const lblW = pdf.getTextWidth(lbl) + 2;
            dottedBlank(lx + lblW, y, segW - 4 - lblW, 9);
          });
          y += 6.5;
        }
      } else {
        sectionHeader('II. THÔNG TIN ĐƠN THUỐC:');
        rxRows.forEach((r, i) => {
          ensureSpace(10);
          const nameStr = `${i + 1}. ${r.brand}${r.generic ? ' (' + r.generic + ')' : ''}`;
          const qtyStr = r.qty ? `${r.qty} ${unitFromForm(r.form)}` : '';
          setF('bold', 10.5);
          const qtyW = qtyStr ? pdf.getTextWidth(qtyStr) : 0;
          const nameLines = wrapped(nameStr, contentWidth - (qtyW ? qtyW + 4 : 0));
          textAt(nameLines[0], marginX, y);
          if (qtyStr) textAt(qtyStr, marginX + contentWidth - qtyW, y);
          y += 5;
          for (let i2 = 1; i2 < nameLines.length; i2++) { ensureSpace(5); textAt(nameLines[i2], marginX, y); y += 5; }
          const usage = usageLine(r);
          if (usage) {
            setF('normal', 9.5);
            const lines = wrapped(usage, contentWidth - 6);
            lines.forEach((ln) => { ensureSpace(4.6); textAt(ln, marginX + 6, y); y += 4.6; });
          }
          y += 2.5;
        });
      }

      if (note) {
        y += 2;
        ensureSpace(6);
        setF('normal', 8.2);
        const lines = wrapped(`Lời dặn của bác sĩ: ${note}`, contentWidth);
        lines.forEach((ln) => { ensureSpace(4.1); textAt(ln, marginX, y); y += 4.1; });
      }

      // Chữ ký
      ensureSpace(34);
      y += 6;
      const signX = marginX + contentWidth * 0.55;
      const signW = contentWidth * 0.45;
      setF('normal', 10);
      if (blankDateSign) {
        // Để trống ngày khám: in "Ngày ..... tháng ..... năm ........." với 3 đoạn chấm xen giữa
        const seg1 = 'Ngày';
        const seg2 = 'tháng';
        const seg3 = 'năm';
        const gap = 2.2; // mm khoảng cách giữa chữ và đoạn chấm liền sau
        const w1 = pdf.getTextWidth(seg1);
        const w2 = pdf.getTextWidth(seg2);
        const w3 = pdf.getTextWidth(seg3);
        // Chia đều phần còn lại (sau khi trừ chữ + khoảng gap) cho 3 đoạn chấm,
        // đoạn chấm cuối (sau "năm") dài hơn một chút để đủ chỗ ghi năm 4 chữ số.
        const textW = w1 + w2 + w3;
        const totalGaps = gap * 3;
        const dotsTotalW = Math.max(18, signW - textW - totalGaps);
        const dot1W = dotsTotalW * 0.28;
        const dot2W = dotsTotalW * 0.28;
        const dot3W = dotsTotalW - dot1W - dot2W;
        let dx = signX + (signW - (textW + totalGaps + dotsTotalW)) / 2;
        textAt(seg1, dx, y); dx += w1 + gap;
        dottedBlank(dx, y, dot1W, 10); dx += dot1W + gap;
        textAt(seg2, dx, y); dx += w2 + gap;
        dottedBlank(dx, y, dot2W, 10); dx += dot2W + gap;
        textAt(seg3, dx, y); dx += w3 + gap;
        dottedBlank(dx, y, dot3W, 10);
      } else {
        let t = dateWords;
        let tw = pdf.getTextWidth(t);
        textAt(t, signX + (signW - tw) / 2, y);
      }
      y += 5.5;
      setF('bold', 10.5);
      let t = 'Bác sĩ khám bệnh';
      let tw = pdf.getTextWidth(t);
      textAt(t, signX + (signW - tw) / 2, y);
      y += 22;
      setF('bold', 10.5);
      if (blankDateSign) {
        // Để trống phần ký tên: chỉ để đường chấm để bác sĩ tự ký & ghi tên
        dottedBlank(signX, y, signW, 10.5);
      } else {
        tw = pdf.getTextWidth(doctor);
        textAt(doctor, signX + (signW - tw) / 2, y);
      }

      const safeName = (name || 'donthuoc').replace(/[^\p{L}\p{N}]+/gu, '_');
      const fileDate = $('rxDate').value || todayLocalISO();
      logUsage('donthuoc_save');
      pdf.save(`DonThuoc_${safeName}_${fileDate}.pdf`);
    } catch (err) {
      customAlert('Lỗi tạo PDF', 'Có lỗi khi tạo PDF: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = originalLabel;
    }
  });
})();
