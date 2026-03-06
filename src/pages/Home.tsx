import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-100">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          <div className="font-extrabold text-xl tracking-wide">
            <span className="text-orange-600">ALO</span>
            <span>- </span>
            <span className="text-orange-600">ĐI NÀO</span>
          </div>

          <Link
            to="/o"
            className="px-4 py-2 rounded-xl bg-orange-600 text-white font-semibold hover:bg-orange-700"
          >
            Quản lý quán
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="mx-auto max-w-6xl px-4 py-16 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <h1 className="text-4xl lg:text-5xl font-extrabold leading-tight">
            Quán nhỏ vẫn chuyên nghiệp.  
            <span className="text-orange-600 block mt-2">
              Chỉ cần 1 mã QR.
            </span>
          </h1>

          <p className="mt-6 text-lg text-slate-600 leading-relaxed">
            ALO-ĐI-NÀO giúp quán tạo menu online và nhận đơn trực tiếp từ khách
            qua QR — không cần app, không cần đăng nhập, không cần đào tạo phức tạp.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <Link
              to="/c"
              className="px-6 py-3 rounded-2xl bg-orange-600 text-white font-semibold hover:bg-orange-700"
            >
              Trải nghiệm đặt món
            </Link>

            <Link
              to="/o"
              className="px-6 py-3 rounded-2xl border border-slate-300 hover:bg-slate-50 font-semibold"
            >
              Tôi là chủ quán
            </Link>
          </div>

          <div className="mt-6 text-sm text-slate-500">
            ⚡ Thiết lập xong trong 5 phút  
            ⚡ Không lẫn dữ liệu giữa các quán  
            ⚡ Tối giản để vận hành nhanh
          </div>
        </div>

        {/* Mock Illustration */}
        <div className="bg-orange-50 rounded-3xl p-10 text-center shadow-lg">
          <div className="text-xl font-bold text-orange-600">
            Khách quét QR
          </div>
          <div className="text-3xl mt-4">📱 → ☕ → 🔔</div>
          <div className="mt-4 text-slate-600">
            Quét → Chọn món → Quán nhận đơn ngay lập tức
          </div>
        </div>
      </section>

      {/* DIFFERENTIATOR */}
      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-3xl font-extrabold text-center">
            Không phải phần mềm quản lý phức tạp.
          </h2>
          <p className="text-center mt-4 text-slate-600 max-w-2xl mx-auto">
            ALO-ĐI-NÀO không cố gắng thay thế mọi thứ.  
            Chúng tôi chỉ tập trung giúp quán nhỏ nhận đơn nhanh,
            rõ ràng và không nhầm lẫn.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <Feature
              title="Tách riêng từng quán"
              desc="Mỗi quán một không gian riêng. Không bao giờ lẫn dữ liệu."
            />
            <Feature
              title="Khách không cần tài khoản"
              desc="Quét QR là vào đặt món ngay."
            />
            <Feature
              title="Nhẹ và nhanh"
              desc="Không kho, không nhân sự, không tính năng thừa."
            />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-3xl font-extrabold text-center">
            Cách hoạt động
          </h2>

          <div className="grid md:grid-cols-3 gap-8 mt-12">
            <Step
              number="01"
              title="Tạo menu"
              desc="Chủ quán thêm món, giá và trạng thái."
            />
            <Step
              number="02"
              title="In QR"
              desc="Đặt mã QR tại bàn hoặc quầy."
            />
            <Step
              number="03"
              title="Nhận đơn realtime"
              desc="Đơn mới xuất hiện ngay trên màn hình quán."
            />
          </div>
        </div>
      </section>

      <footer className="py-10 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} ALO- ĐI NÀO  
        <div className="mt-2">Giải pháp QR order tối giản cho quán nhỏ.</div>
      </footer>
    </div>
  );
}

function Feature({ title, desc }: any) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow border border-slate-100">
      <div className="text-orange-600 font-bold">{title}</div>
      <div className="mt-2 text-slate-600 text-sm">{desc}</div>
    </div>
  );
}

function Step({ number, title, desc }: any) {
  return (
    <div className="text-center">
      <div className="text-orange-600 font-bold text-xl">{number}</div>
      <div className="mt-2 font-bold">{title}</div>
      <div className="mt-2 text-sm text-slate-600">{desc}</div>
    </div>
  );
}