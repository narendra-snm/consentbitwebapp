
import platform from '../../../public/images/platform1.svg'
 const imgGroup = "data:image/svg+xml,%3Csvg%20preserveAspectRatio%3D%22none%22%20width%3D%22100%25%22%20height%3D%22100%25%22%20overflow%3D%22visible%22%20style%3D%22display%3A%20block%3B%22%20viewBox%3D%220%200%2012%209.6%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%0A%3Cg%20id%3D%22clip1_245_3475%22%3E%0A%3Cpath%20id%3D%22Vector%22%20d%3D%22M12%200H0V9.6H12V0Z%22%20fill%3D%22var(--fill-0%2C%20black)%22%2F%3E%0A%3C%2Fg%3E%0A%3C%2Fsvg%3E%0A";
const svgPaths ={
p3e9d1a00: "M11.6636 6.347L11.2166 5.59668L9.0561 6.86757L11.4557 3.91694L11.8183 3.71139L11.7378 3.57063L11.8936 3.3785L11.3998 2.98155L11.3361 2.87058L11.2923 2.89515L11.1361 2.77004L10.8139 3.16625L3.80108 7.14014L6.38082 4.14482L11.1987 1.59522L10.7408 0.740639L8.11689 2.12919L9.40863 0.629673L8.66835 0L5.76042 3.37626L2.87198 4.9052L5.08346 2.08265L6.46886 1.38669L6.02904 0.522804L1.99157 2.55183L3.093 1.1454L2.32425 0.550731L0 3.51999L0.0363398 3.54792L0.470544 4.40138L3.04655 3.10667L0.698699 6.1031L1.0827 6.40062L1.3116 6.82773L4.02473 5.39189L1.03775 8.86011L1.77765 9.48978L1.92639 9.31699L9.13215 5.23362L6.73973 8.17533L6.77868 8.20661L6.77493 8.20922L7.27095 9.0422L10.4528 7.17068L9.22806 9.07943L10.0493 9.6L12 6.56037L11.6636 6.347Z",
};
export default function FeedbackDesign() {
  return (
    <div className=" bg-white pt-3.25 flex items-start justify-center">
      <div className="grid w-full grid-cols-2 gap-[16px]">
        {/* Left Section - Supported tech tools */}
        <div className="bg-[#f6f6f6] border border-[#ededed] rounded-[10px] max-w-[566px] min-h-[116px] p-[14px]">
          <h2 
            className="font-['DM_Sans:SemiBold',sans-serif] font-semibold text-[16px] text-black leading-[20px] mb-[7px]"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            Supported tech tools.
          </h2>
          <p 
            className="font-['DM_Sans:Regular',sans-serif] font-normal text-[12px] text-black opacity-80 leading-[normal] tracking-[-0.24px] mb-[13px]"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            Refer to our platform-wise guides for instructions.
          </p>
          
          {/* Icons Row */}
          <div className="flex items-center gap-0 relative">
            {/* Screenshot with icons overlay */}
            <div className="relative h-[31px] w-full mix-blend-multiply">
              <img 
                alt="Tech tools" 
                className="h-8  object-cover absolute left-[-0.96%] top-[-9.68%]"
                src={platform.src} 
              />
            </div>
            
            {/* Icon boxes overlaid */}
           
          </div>
        </div>

        {/* Right Section - Share your feedbacks */}
        <div className="bg-[#f6f6f6] border border-[#ededed] rounded-[10px] max-w-[566px] min-h-[116px] p-[14px]">
          <h2 
            className="font-['DM_Sans:SemiBold',sans-serif] font-semibold text-[16px] text-black leading-[20px] mb-[15px]"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            Share your feedbacks
          </h2>
          
          {/* Input with Submit Button */}
          <div className="relative w-full max-w-[529px] h-[51px]">
            <input
              type="text"
              placeholder="please share your feedback and suggestions here"
              className="w-full h-full bg-white border border-[#d9d9d9] rounded-[5px] px-[17px] py-[15.5px] font-['DM_Sans:Regular',sans-serif] font-normal text-[13px] text-black leading-[20px] outline-none focus:border-[#007aff] transition-colors"
              style={{ fontVariationSettings: "'opsz' 14" }}
            />
            <button className="absolute right-[8px] top-[8px] bg-[#007aff] hover:bg-[#0066dd] border border-[#007aff] rounded-[4px] px-[11px] py-[8px] h-[36px] w-[94px] flex items-center justify-center transition-colors">
              <span 
                className="font-['DM_Sans:Regular',sans-serif] font-normal text-[15px] text-white leading-[20px] whitespace-nowrap"
                style={{ fontVariationSettings: "'opsz' 14" }}
              >
                Submit
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
