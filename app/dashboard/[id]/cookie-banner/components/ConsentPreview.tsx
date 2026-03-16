export default function ConsentPreview() {
  return (
    <div className="w-full  px-4.5">

      {/* Tabs */}
     <div className="flex items-center justify-between mb-4 mt-4.5">

      {/* Left Side Tabs */}
      <div className="flex items-center gap-4">
        <div className="bg-[#edeefc] border-b-2 border-[#007aff] h-[30px] rounded-t-md px-3 flex items-center">
          <p className="font-medium text-base text-[#007aff]">GDPR</p>
        </div>

        <p className="text-base text-[#111827] cursor-pointer">CCPA</p>
      </div>

      {/* Right Side Buttons */}
      <div className="flex items-center gap-3">

        {/* Save Button */}
        <button className="w-9 h-9 flex items-center justify-center border border-[#e5e5e5] rounded-lg bg-[#f9f9fa] hover:bg-gray-100 transition-colors">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect x="0.5" y="0.5" width="35" height="35" rx="7.5" fill="#F9F9FA"/>
<rect x="0.5" y="0.5" width="35" height="35" rx="7.5" stroke="#E5E5E5"/>
<path d="M12.75 24.75H23.25C23.6478 24.75 24.0294 24.592 24.3107 24.3107C24.592 24.0294 24.75 23.6478 24.75 23.25V15C24.7506 14.9013 24.7317 14.8035 24.6943 14.7121C24.657 14.6207 24.602 14.5376 24.5325 14.4675L21.5325 11.4675C21.4624 11.398 21.3793 11.343 21.2879 11.3057C21.1966 11.2684 21.0987 11.2494 21 11.25H12.75C12.3522 11.25 11.9706 11.408 11.6893 11.6894C11.408 11.9707 11.25 12.3522 11.25 12.75V23.25C11.25 23.6478 11.408 24.0294 11.6893 24.3107C11.9706 24.592 12.3522 24.75 12.75 24.75ZM20.25 23.25H15.75V19.5H20.25V23.25ZM18.75 14.25H17.25V12.75H18.75V14.25ZM12.75 12.75H14.25V15.75H20.25V12.75H20.6925L23.25 15.3075V23.25H21.75V19.5C21.75 19.1022 21.592 18.7207 21.3107 18.4394C21.0294 18.158 20.6478 18 20.25 18H15.75C15.3522 18 14.9706 18.158 14.6893 18.4394C14.408 18.7207 14.25 19.1022 14.25 19.5V23.25H12.75V12.75Z" fill="#4B5563"/>
</svg>

        </button>

        {/* Publish */}
        <button className="px-4 h-9 bg-[#2ec04f] text-white text-sm rounded-lg hover:bg-[#26a342] transition-colors">
          Publish Changes
        </button>

        {/* Next */}
        <button className="px-4 h-9 bg-[#007aff] text-white text-sm rounded-lg hover:bg-[#0066d6] transition-colors">
          Next
        </button>

      </div>
    </div>

      {/* Browser Preview */}
      <div className="w-full rounded-md overflow-hidden shadow-lg">

        {/* Browser Header */}
        <div className="h-[24px] bg-[#d9d9d9] opacity-50 flex items-center px-2 gap-2">
          <div className="w-2 h-2 rounded-full bg-red-400"></div>
          <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
        </div>

        {/* Preview Area */}
        <div className="relative bg-gray-100 h-[420px] flex items-end p-6">

          {/* Cookie Banner */}
          <div className="bg-white rounded-md shadow-lg w-[360px] p-4">

            <p className="font-semibold text-[13px] text-black opacity-80 tracking-tight mb-2">
              We value your privacy
            </p>

            <p className="text-[11px] text-black opacity-80 tracking-tight mb-3">
              We use cookies to enhance your browsing experience, serve
              personalised ads or content, and analyse our traffic. By clicking
              "Accept All", you consent to our use of cookies.
            </p>

            <div className="flex gap-2">
              <button className="px-3 py-[2px] border border-[#007aff] text-[10px] text-[#007aff]">
                Preferences
              </button>

              <button className="px-3 py-[2px] bg-[#007aff] text-[10px] text-white">
                Reject
              </button>

              <button className="px-3 py-[2px] bg-[#007aff] text-[10px] text-white">
                Ok, Got it
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Device Selector */}
      <div className="flex gap-6 mt-6 items-center">

        <div className="flex items-center gap-2">
          <div className="w-[10px] h-[17px] border-2 border-gray-600 rounded-sm"></div>
          <p className="text-base text-gray-600">Phone</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-[16px] h-[17px] border-2 border-gray-600 rounded-sm"></div>
          <p className="text-base text-gray-600">Tab</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-[24px] h-[17px] border-2 border-[#007aff] rounded-sm"></div>
          <p className="text-base text-[#007aff]">Desktop</p>
        </div>

      </div>

    </div>
  );
}