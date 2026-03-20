export default function ConsentDashboard() {
  return (
    <div className="relative mx-auto max-w-[1139px] h-[658px] mt-5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Blue header section */}
      <div className="absolute bg-[#e6f1fd] h-[116px] left-0 rounded-[10px] top-0 w-[1139px]" />
      
      {/* Site label */}
      <p 
        className="absolute font-medium leading-[normal] left-[28px] text-[#4b5563] text-[16px] top-[25px] whitespace-nowrap" 
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        Site
      </p>
      <p 
        className="absolute font-medium leading-[normal] left-[63px] opacity-60 text-[#4b5563] text-[16px] top-[25px] whitespace-nowrap" 
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        : Acme.com
      </p>

      {/* Total consent events */}
      <p 
        className="absolute font-medium leading-[normal] left-[28px] text-[#4b5563] text-[16px] top-[67px] whitespace-nowrap" 
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        Total consent events: 1 | Cookie inventory (for context): 8 cookies
      </p>
      <p 
        className="absolute font-medium leading-[normal] left-[523px] opacity-60 text-[#4b5563] text-[16px] top-[67px] whitespace-nowrap" 
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        : 8 Cookies
      </p>

      {/* Blue headers row 1 */}
      <p 
        className="absolute font-medium leading-[normal] left-[28px] text-[#007aff] text-[16px] top-[137px] tracking-[-0.32px] whitespace-nowrap" 
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        Time (UTC)
      </p>
      <p 
        className="absolute font-medium leading-[normal] left-[259px] text-[#007aff] text-[16px] top-[137px] tracking-[-0.32px] whitespace-nowrap" 
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        Status
      </p>
      <p 
        className="absolute font-medium leading-[normal] left-[426px] text-[#007aff] text-[16px] top-[137px] tracking-[-0.32px] whitespace-nowrap" 
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        Method
      </p>
      <p 
        className="absolute font-medium leading-[normal] left-[600px] text-[#007aff] text-[16px] top-[137px] tracking-[-0.32px] whitespace-nowrap" 
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        Analytics / Marketing / Preferences
      </p>

      {/* Data row 1 */}
      <p 
        className="absolute font-medium leading-[normal] left-[28px] text-[#4b5563] text-[15px] top-[166px] whitespace-nowrap" 
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        11/2/2026, 11:47:38 pm
      </p>
      <p 
        className="absolute font-medium leading-[normal] left-[259px] text-[#4b5563] text-[15px] top-[166px] whitespace-nowrap" 
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        Given
      </p>
      <p 
        className="absolute font-medium leading-[normal] left-[426px] text-[#4b5563] text-[15px] top-[166px] whitespace-nowrap" 
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        banner
      </p>
      <div 
        className="absolute font-medium leading-[normal] left-[600px] text-[#4b5563] text-[15px] top-[166px] w-[537px]" 
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        <p className="mb-0">Essential: Accepted, Analytics: Accepted, Marketing: Accepted,</p>
        <p>Preferences: Accepted</p>
      </div>

      {/* Line separator 1 */}
      <div className="absolute h-0 left-0 top-[209px] w-[1137px]">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1137 1">
            <line opacity="0.1" stroke="black" x2="1137" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>

      {/* Blue header - Cookie inventory */}
      <p 
        className="absolute font-medium leading-[normal] left-[28px] text-[#007aff] text-[16px] top-[226px] tracking-[-0.32px] whitespace-nowrap" 
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        Cookie inventory (set by whom, for what)
      </p>

      {/* Description text */}
      <p 
        className="absolute font-medium leading-[normal] left-[28px] text-[#4b5563] text-[16px] top-[259px] whitespace-nowrap" 
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        These are cookies detected for this site. Consent above shows whether the user accepted or rejected analytics/marketing
      </p>

      {/* Table headers */}
      <p 
        className="absolute font-semibold leading-[normal] left-[28px] text-[17px] text-black top-[321px] whitespace-nowrap" 
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        Cookie
      </p>
      <p 
        className="absolute font-semibold leading-[normal] left-[259px] text-[17px] text-black top-[321px] whitespace-nowrap" 
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        Category
      </p>
      <p 
        className="absolute font-semibold leading-[normal] left-[441px] text-[17px] text-black top-[321px] whitespace-nowrap" 
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        Provider
      </p>
      <p 
        className="absolute font-semibold leading-[normal] left-[600px] text-[17px] text-black top-[321px] whitespace-nowrap" 
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        Purpose / Description
      </p>

      {/* Line separator 2 */}
      <div className="absolute h-0 left-[28px] top-[352px] w-[1111px]">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1111 1">
            <line opacity="0.1" stroke="black" x2="1111" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>

      {/* Row 1 */}
      <p 
        className="absolute font-medium leading-[normal] left-[28px] text-[#4b5563] text-[16px] top-[382px] whitespace-nowrap" 
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        _Ga
      </p>
      <p 
        className="absolute font-medium leading-[normal] left-[259px] text-[#4b5563] text-[16px] top-[382px] whitespace-nowrap" 
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        Category
      </p>
      <p 
        className="absolute font-medium leading-[normal] left-[441px] text-[#4b5563] text-[16px] top-[382px] whitespace-nowrap" 
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        Category
      </p>
      <p 
        className="absolute font-medium leading-[normal] left-[600px] text-[#4b5563] text-[15px] top-[383px] w-[537px]" 
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        Na
      </p>

      {/* Line separator 3 */}
      <div className="absolute h-0 left-[28px] top-[422px] w-[1111px]">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1111 1">
            <line opacity="0.1" stroke="black" x2="1111" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>

      {/* Row 2 */}
      <p 
        className="absolute font-medium leading-[normal] left-[28px] text-[#4b5563] text-[16px] top-[444px] whitespace-nowrap" 
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        _Ga
      </p>
      <p 
        className="absolute font-medium leading-[normal] left-[259px] text-[#4b5563] text-[16px] top-[444px] whitespace-nowrap" 
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        Category
      </p>
      <p 
        className="absolute font-medium leading-[normal] left-[441px] text-[#4b5563] text-[16px] top-[444px] whitespace-nowrap" 
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        Category
      </p>
      <p 
        className="absolute font-medium leading-[normal] left-[600px] text-[#4b5563] text-[15px] top-[445px] w-[537px]" 
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        Na
      </p>

      {/* Line separator 4 */}
      <div className="absolute h-0 left-[28px] top-[484px] w-[1111px]">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1111 1">
            <line opacity="0.1" stroke="black" x2="1111" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>

      {/* Row 3 */}
      <p 
        className="absolute font-medium leading-[normal] left-[28px] text-[#4b5563] text-[16px] top-[503px] whitespace-nowrap" 
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        _Ga
      </p>
      <p 
        className="absolute font-medium leading-[normal] left-[259px] text-[#4b5563] text-[16px] top-[503px] whitespace-nowrap" 
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        Category
      </p>
      <p 
        className="absolute font-medium leading-[normal] left-[441px] text-[#4b5563] text-[16px] top-[503px] whitespace-nowrap" 
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        Category
      </p>
      <p 
        className="absolute font-medium leading-[normal] left-[600px] text-[#4b5563] text-[15px] top-[504px] w-[537px]" 
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        Na
      </p>

      {/* Line separator 5 */}
      <div className="absolute h-0 left-[28px] top-[542px] w-[1111px]">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1111 1">
            <line opacity="0.1" stroke="black" x2="1111" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>

      {/* Row 4 */}
      <p 
        className="absolute font-medium leading-[normal] left-[28px] text-[#4b5563] text-[16px] top-[560px] whitespace-nowrap" 
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        _Ga
      </p>
      <p 
        className="absolute font-medium leading-[normal] left-[259px] text-[#4b5563] text-[16px] top-[560px] whitespace-nowrap" 
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        Category
      </p>
      <p 
        className="absolute font-medium leading-[normal] left-[441px] text-[#4b5563] text-[16px] top-[560px] whitespace-nowrap" 
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        Category
      </p>
      <p 
        className="absolute font-medium leading-[normal] left-[600px] text-[#4b5563] text-[15px] top-[561px] w-[537px]" 
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        Na
      </p>

      {/* Line separator 6 */}
      <div className="absolute h-0 left-[28px] top-[600px] w-[1111px]">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1111 1">
            <line opacity="0.1" stroke="black" x2="1111" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>

      {/* Row 5 */}
      <p 
        className="absolute font-medium leading-[normal] left-[28px] text-[#4b5563] text-[16px] top-[618px] whitespace-nowrap" 
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        _Ga
      </p>
      <p 
        className="absolute font-medium leading-[normal] left-[259px] text-[#4b5563] text-[16px] top-[618px] whitespace-nowrap" 
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        Category
      </p>
      <p 
        className="absolute font-medium leading-[normal] left-[441px] text-[#4b5563] text-[16px] top-[618px] whitespace-nowrap" 
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        Category
      </p>
      <p 
        className="absolute font-medium leading-[normal] left-[600px] text-[#4b5563] text-[15px] top-[619px] w-[537px]" 
        style={{ fontVariationSettings: "'opsz' 14" }}
      >
        Na
      </p>

      {/* Line separator 7 */}
      <div className="absolute h-0 left-[28px] top-[658px] w-[1111px]">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1111 1">
            <line opacity="0.1" stroke="black" x2="1111" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
    </div>
  );
}
