import { Plane, RotateCcw, Truck, ShieldCheck } from "lucide-react";

interface FeatureItem {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}

export default function WhyMaltina() {
  const features: FeatureItem[] = [
    {
      icon: <Plane className="w-7 h-7 text-blue-600" />,
      title: "ارسال اکسپرس به ایران",
    },
    {
      icon: <RotateCcw className="w-7 h-7 text-blue-600" />,
      title: "پاسخ گویی سریع",
    },
    {
      icon: <Truck className="w-7 h-7 text-blue-600" />,
      title: "حمل رایگان داخل کشور",
    },
    {
      icon: <ShieldCheck className="w-7 h-7 text-blue-600" />,
      title: "تضمین زمان تحویل کالا",
    },
  ];

  return (
    <div className="sm:max-w-7xl sm:mx-auto sm:px-6">
      <div className="rounded-xl shadow-sm border border-transparent bg-gradient-to-br from-sky-50 via-teal-50 to-emerald-50">
        <div className="px-4 sm:px-8 py-6">
          <h3
            className="text-center text-lg sm:text-xl font-bold text-green-700 mb-6"
            style={{ fontFamily: "BYekan, sans-serif" }}
          >
            چرا از جی استایل خرید کنم؟
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {features.map((item, idx) => (
              <div key={idx} className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-white/70 backdrop-blur-sm flex items-center justify-center mb-3 border border-white/60">
                  {item.icon}
                </div>
                <div
                  className="text-sm sm:text-base text-green-700 leading-6"
                  style={{ fontFamily: "BYekan, sans-serif" }}
                >
                  {item.title}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
