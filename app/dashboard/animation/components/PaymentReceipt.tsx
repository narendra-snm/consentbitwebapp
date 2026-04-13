
 const imgLeftFold = "data:image/svg+xml,%3Csvg%20preserveAspectRatio%3D%22none%22%20width%3D%22100%25%22%20height%3D%22100%25%22%20overflow%3D%22visible%22%20style%3D%22display%3A%20block%3B%22%20viewBox%3D%220%200%20451%20449.385%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%0A%3Cpath%20id%3D%22Mask%22%20d%3D%22M0%20155.569C0%20153.064%200%20151.812%200.345206%20150.675C0.650815%20149.669%201.15185%20148.733%201.81963%20147.92C2.57395%20147.003%203.61591%20146.308%205.69984%20144.919L218.4%203.11863C220.966%201.40793%20222.249%200.552579%20223.636%200.22026C224.861%20-0.07342%20226.139%20-0.07342%20227.364%200.22026C228.751%200.552579%20230.034%201.40793%20232.6%203.11864L445.3%20144.919C447.384%20146.308%20448.426%20147.003%20449.18%20147.92C449.848%20148.733%20450.349%20149.669%20450.655%20150.675C451%20151.812%20451%20153.064%20451%20155.569V436.585C451%20441.066%20451%20443.306%20450.128%20445.017C449.361%20446.522%20448.137%20447.746%20446.632%20448.513C444.921%20449.385%20442.68%20449.385%20438.2%20449.385H12.8C8.31958%20449.385%206.07937%20449.385%204.36808%20448.513C2.86278%20447.746%201.63893%20446.522%200.871948%20445.017C0%20443.306%200%20441.066%200%20436.585L0%20155.569Z%22%20fill%3D%22var(--fill-0%2C%20black)%22%2F%3E%0A%3C%2Fsvg%3E%0A";
import { useMemo } from 'react';






function SuccessBanner() {
  return (
     <div className=" w-[327.0000072721654px] h-[46px] flex items-center justify-center   rounded-t-[6px] bg-gradient-to-br from-[#34c759] to-[#2eb84d] shadow-[0px_24px_6.4px_0px_rgba(30,41,59,0),0px_15px_5.8px_0px_rgba(30,41,59,0.01),0px_9px_4.9px_0px_rgba(30,41,59,0.03),0px_4px_3.7px_0px_rgba(30,41,59,0.05),0px_1px_2px_0px_rgba(30,41,59,0.06)]">
   
        
        <p className=" text-center font-bold leading-[24px] text-[18px] text-white whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
         <img src="/images/success.svg" alt="Success Banner" className='inline mr-1' />   Payment Successful!
        </p>
      
     
    </div>
  );
}

function ReceiptCard() {
  // Generate random data
  const receiptData = useMemo(() => {
    const amounts = ['$49.99', '$89.99', '$129.99', '$149.99', '$199.99', '$249.99'];
    const txnIds = [
      'TXN-789823456-3',
      'TXN-456789123-7',
      'TXN-912345678-2',
      'TXN-345678912-5',
      'TXN-678912345-9'
    ];
    const lastFourDigits = ['4242', '5678', '9012', '3456', '7890', '1234'];
    const dates = [
      'Dec 15, 2024',
      'Jan 10, 2025',
      'Feb 5, 2025',
      'Mar 20, 2025',
      'Apr 9, 2026'
    ];
    const merchants = [
      'TechStore Pro',
      'Digital Marketplace',
      'CloudSoft Inc.',
      'DevTools Plus',
      'SaaS Platform'
    ];

    return {
      amount: amounts[Math.floor(Math.random() * amounts.length)],
      txnId: txnIds[Math.floor(Math.random() * txnIds.length)],
      cardLast4: lastFourDigits[Math.floor(Math.random() * lastFourDigits.length)],
      date: dates[Math.floor(Math.random() * dates.length)],
      merchant: merchants[Math.floor(Math.random() * merchants.length)]
    };
  }, []);

  return (
    <div className="rounded-[6px] rotate-[5deg] absolute left-1/2 top-[100px] max-w-[244px] -translate-x-1/2 w-[266px] rounded-[12px] bg-[#ECECF0] ">
     
      <div className="flex flex-col pb-[9px] p-2">
        <div className="flex items-center justify-between">
          <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[20px] text-[#64748b] text-[12px]" style={{ fontVariationSettings: "'opsz' 14" }}>
            Amount
          </p>
          <p className="font-['DM_Sans:Bold',sans-serif] font-bold leading-[24px] text-[#0f172a] text-[12px]" style={{ fontVariationSettings: "'opsz' 14" }}>
            {receiptData.amount}
          </p>
        </div>
        <div className="h-px bg-[#e2e8f0] mb-4" />
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between">
            <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[18px] text-[#64748b] text-[12px]" style={{ fontVariationSettings: "'opsz' 14" }}>
              Transaction ID
            </p>
            <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[18px] text-[#0f172a] text-[12px] text-right" style={{ fontVariationSettings: "'opsz' 14" }}>
              {receiptData.txnId}
            </p>
          </div>
          <div className="flex items-start justify-between">
            <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[18px] text-[#64748b] text-[12px]" style={{ fontVariationSettings: "'opsz' 14" }}>
              Payment Method
            </p>
            <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[18px] text-[#0f172a] text-[12px] text-right" style={{ fontVariationSettings: "'opsz' 14" }}>
              **** {receiptData.cardLast4}
            </p>
          </div>
          <div className="flex items-start justify-between">
            <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[18px] text-[#64748b] text-[12px]" style={{ fontVariationSettings: "'opsz' 14" }}>
              Date
            </p>
            <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[18px] text-[#0f172a] text-[12px] text-right" style={{ fontVariationSettings: "'opsz' 14" }}>
              {receiptData.date}
            </p>
          </div>
          <div className="flex items-start justify-between">
            <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[18px] text-[#64748b] text-[12px]" style={{ fontVariationSettings: "'opsz' 14" }}>
              Merchant
            </p>
            <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[18px] text-[#0f172a] text-[12px] text-right" style={{ fontVariationSettings: "'opsz' 14" }}>
              {receiptData.merchant}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentReceipt() {
  const randomEmail = useMemo(() => {
    const emails = [
      "customer@example.com",
      "john.doe@email.com",
      "sarah.smith@company.com",
      "alex.johnson@mail.com",
      "user@domain.com",
    ];
    return emails[Math.floor(Math.random() * emails.length)];
  }, []);

  return (
    <div className="relative w-full min-h-screen bg-[#eaf2ff] overflow-hidden rounded-[24px] flex items-center justify-center p-6">
      <div className="w-full max-w-[720px] flex flex-col items-center ">
        <div className="relative w-[451px] h-[500px]">
             <img src="/images/open.svg" alt="Dashboard Overview" />
          
          <ReceiptCard />
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-1 text-[#1E1E1ECC]">
            <svg width="11" height="9" viewBox="0 0 11 9" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M8.9375 0H2.0625C0.925375 0 0 0.90855 0 2.025V6.975C0 8.09145 0.925375 9 2.0625 9H8.9375C10.0746 9 11 8.09145 11 6.975V2.025C11 0.90855 10.0746 0 8.9375 0ZM2.0625 0.45H8.9375C9.43433 0.45 9.87388 0.6777 10.1686 1.02735L6.64354 4.48875C6.34013 4.7862 5.92992 4.95 5.49908 4.95C5.08017 4.94235 4.66217 4.788 4.35692 4.48875L0.831417 1.02735C1.12612 0.6777 1.56521 0.45 2.0625 0.45ZM10.5417 6.975C10.5417 7.8435 9.82208 8.55 8.9375 8.55H2.0625C1.17792 8.55 0.458333 7.8435 0.458333 6.975V2.025C0.458333 1.81035 0.502792 1.60605 0.582542 1.4193L4.03288 4.8069C4.42292 5.18985 4.94037 5.4 5.489 5.4C6.03762 5.4 6.57754 5.18985 6.96758 4.8069L10.4179 1.4193C10.4977 1.60605 10.5421 1.81035 10.5421 2.025L10.5417 6.975Z" fill="#1E1E1E" fill-opacity="0.8"/>
</svg>

            <p className="text-[11px] leading-[18px]">
              Receipt sent to {randomEmail}
            </p>
          </div>

          <button className="h-[44px] px-6 rounded-[8px] bg-[#007aff] text-white font-semibold text-[14px] shadow-sm hover:bg-[#0051d5] transition-colors">
            Download Receipt
          </button>

          <p className="text-[10px] leading-[18px] text-[#717182] opacity-60">
            Need help? Contact our support team at support@techstore.com
          </p>
        </div>
      </div>
    </div>
  );
}
