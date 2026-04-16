import { Headphones, SlidersHorizontal, Paintbrush, CreditCard } from "lucide-react";
import Link from "next/link";

export default function GettingStarted({ activeSiteId }: { activeSiteId?: string | null }) {
  return (
    <div className="bg-gray-100 rounded-xl mt-5.5 px-6 py-6.5 grid grid-cols-[1fr_1.3fr_1.3fr_1fr] divide-x divide-gray-200">

      {/* ITEM 1 */}
      <div className="pr-6 flex flex-col">
        <div>
          <span className="text-xs bg-[linear-gradient(259.32deg,_#EDEEFC_5.12%,_#78B8FF_118.29%)]  px-2.75 py-2 rounded-full ">
            Get Started
          </span>

          <h3 className="mt-3 font-semibold ">
            Implement ConsentBit
          </h3>

          <p className="text-sm  mt-2 ">
            Implement Consent Studio
          </p>
        </div>

        <div className="flex items-center gap-3 pt-5.75 mt-auto relative bottom-[-6px]">
          <a
            href="https://docs.consentbit.com"
            target="_blank"
            rel="noreferrer"
            className="bg-[#007AFF] text-white text-sm px-4 py-1.5 rounded-md whitespace-nowrap"
          >
            help Doc
          </a>

          <a
            href="https://docs.consentbit.com/support"
            target="_blank"
            rel="noreferrer"
            className="flex items-center font-medium gap-1 text-[#007AFF] text-[15px] cursor-pointer whitespace-nowrap"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M7.99992 1.33333C4.32392 1.33333 1.33325 4.324 1.33325 8V10.762C1.33325 11.4447 1.93125 12 2.66659 12H3.33325C3.51006 12 3.67963 11.9298 3.80466 11.8047C3.92968 11.6797 3.99992 11.5101 3.99992 11.3333V7.90467C3.99992 7.72786 3.92968 7.55829 3.80466 7.43326C3.67963 7.30824 3.51006 7.238 3.33325 7.238H2.72792C3.09859 4.658 5.31859 2.66667 7.99992 2.66667C10.6813 2.66667 12.9013 4.658 13.2719 7.238H12.6666C12.4898 7.238 12.3202 7.30824 12.1952 7.43326C12.0702 7.55829 11.9999 7.72786 11.9999 7.90467V12C11.9999 12.7353 11.4019 13.3333 10.6666 13.3333H9.33325V12.6667H6.66658V14.6667H10.6666C12.1373 14.6667 13.3333 13.4707 13.3333 12C14.0686 12 14.6666 11.4447 14.6666 10.762V8C14.6666 4.324 11.6759 1.33333 7.99992 1.33333Z" fill="#007AFF"/>
</svg>

            Get Support
          </a>
        </div>
      </div>

      {/* ITEM 2 */}
      <div className="px-6 flex flex-col">
        <div>
          <span className="text-xs bg-[linear-gradient(259.32deg,_#EDEEFC_5.12%,_#78B8FF_118.29%)]  px-2.75 py-2 rounded-full ">
            Suggestion
          </span>

          <h3 className="mt-3 font-semibold ">
            Review compliance settings
          </h3>

          <p className="text-sm  mt-1">
            Configure how your banner behaves to stay compliant with privacy laws.
          </p>
        </div>

        <Link
          href={activeSiteId ? `/dashboard/${activeSiteId}/cookie-banner` : "/dashboard/one"}
          className="flex items-center font-medium gap-1.5 text-[#007AFF] text-[15px] mt-auto pt-6 cursor-pointer"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M13.75 4.0625H10" stroke="#007AFF" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
<path d="M3.75 4.0625H1.25" stroke="#007AFF" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
<path d="M6.25 6.25C7.45812 6.25 8.4375 5.27062 8.4375 4.0625C8.4375 2.85438 7.45812 1.875 6.25 1.875C5.04188 1.875 4.0625 2.85438 4.0625 4.0625C4.0625 5.27062 5.04188 6.25 6.25 6.25Z" stroke="#007AFF" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
<path d="M13.75 10.9375H11.25" stroke="#007AFF" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
<path d="M5 10.9375H1.25" stroke="#007AFF" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
<path d="M8.75 13.125C9.95812 13.125 10.9375 12.1456 10.9375 10.9375C10.9375 9.72938 9.95812 8.75 8.75 8.75C7.54188 8.75 6.5625 9.72938 6.5625 10.9375C6.5625 12.1456 7.54188 13.125 8.75 13.125Z" stroke="#007AFF" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
</svg>

          Review Settings
        </Link>
      </div>

      {/* ITEM 3 */}
      <div className="px-6 flex flex-col">
        <div>
          <span className="text-xs bg-[linear-gradient(259.32deg,_#EDEEFC_5.12%,_#78B8FF_118.29%)]  px-2.75 py-2 rounded-full ">
            Suggestion
          </span>

          <h3 className="mt-3 font-semibold ">
            Customize your banner design
          </h3>

          <p className="text-sm  mt-1">
            Customize colors, buttons, and layout to make your consent banner match your brand.
          </p>
        </div>

        <Link
          href={activeSiteId ? `/dashboard/${activeSiteId}/cookie-banner` : "/dashboard"}
          className="flex items-center font-medium gap-1.5 text-[#007AFF] text-[15px] mt-auto pt-6 cursor-pointer"
        >
         <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M8.93331 1.39736C7.83406 1.24691 6.71467 1.37096 5.67505 1.75845C4.63542 2.14594 3.70791 2.78481 2.97531 3.61803C2.34831 4.34015 1.8831 5.18809 1.61092 6.10488C1.33875 7.02167 1.26591 7.98609 1.39731 8.93336C1.75064 11.5294 3.70264 13.738 6.25397 14.4307C6.82272 14.5863 7.40964 14.6657 7.99931 14.6667L8.09397 14.666C8.431 14.6617 8.76147 14.5723 9.05471 14.4061C9.34794 14.2399 9.59444 14.0023 9.77131 13.7154C9.94877 13.43 10.0512 13.1044 10.069 12.7688C10.0868 12.4332 10.0195 12.0986 9.87331 11.796L9.74064 11.5187C9.6386 11.3193 9.59068 11.0967 9.60168 10.873C9.61268 10.6493 9.6822 10.4324 9.80331 10.244C9.97658 9.96256 10.2481 9.75531 10.5652 9.66234C10.8824 9.56938 11.2228 9.59729 11.5206 9.7407L11.7953 9.87203C12.07 10.004 12.362 10.0714 12.6626 10.0714C13.1888 10.0687 13.6931 9.86021 14.0676 9.49058C14.4421 9.12095 14.6571 8.61947 14.6666 8.09336C14.6749 7.47203 14.5957 6.85262 14.4313 6.25336C13.738 3.7027 11.5293 1.7507 8.93331 1.39736ZM12.372 8.67003L12.0973 8.5387C10.8786 7.95336 9.38397 8.4067 8.67397 9.5347C8.18197 10.3187 8.13197 11.252 8.53797 12.096L8.67064 12.3734C8.72036 12.4741 8.74335 12.586 8.7374 12.6981C8.73145 12.8103 8.69675 12.9191 8.63664 13.014C8.57806 13.111 8.49555 13.1913 8.39702 13.2472C8.2985 13.3031 8.18726 13.3328 8.07397 13.3334H7.99931C7.52749 13.3321 7.05789 13.2686 6.60264 13.1447C4.56064 12.5907 3.00064 10.8254 2.71864 8.75403C2.50464 7.18403 2.95331 5.67203 3.98064 4.4947C4.56513 3.82418 5.30801 3.31046 6.14168 3.00028C6.97535 2.6901 7.87335 2.5933 8.75397 2.7187C10.8253 3.0007 12.5906 4.56136 13.1446 6.6027C13.2766 7.08937 13.34 7.58536 13.3326 8.07403C13.3246 8.61203 12.7693 8.8627 12.372 8.67003Z" fill="#007AFF"/>
<path d="M4.99996 10.6667C5.55224 10.6667 5.99996 10.219 5.99996 9.66667C5.99996 9.11438 5.55224 8.66667 4.99996 8.66667C4.44767 8.66667 3.99996 9.11438 3.99996 9.66667C3.99996 10.219 4.44767 10.6667 4.99996 10.6667Z" fill="#007AFF"/>
<path d="M4.99996 8C5.55224 8 5.99996 7.55228 5.99996 7C5.99996 6.44771 5.55224 6 4.99996 6C4.44767 6 3.99996 6.44771 3.99996 7C3.99996 7.55228 4.44767 8 4.99996 8Z" fill="#007AFF"/>
<path d="M6.99996 6C7.55224 6 7.99996 5.55228 7.99996 5C7.99996 4.44771 7.55224 4 6.99996 4C6.44767 4 5.99996 4.44771 5.99996 5C5.99996 5.55228 6.44767 6 6.99996 6Z" fill="#007AFF"/>
<path d="M9.66663 6C10.2189 6 10.6666 5.55228 10.6666 5C10.6666 4.44771 10.2189 4 9.66663 4C9.11434 4 8.66663 4.44771 8.66663 5C8.66663 5.55228 9.11434 6 9.66663 6Z" fill="#007AFF"/>
</svg>

          Style your banner
        </Link>
      </div>

      {/* ITEM 4 */}
      <div className="pl-6 flex flex-col">
        <div>
          <span className="text-xs bg-[linear-gradient(259.32deg,_#EDEEFC_5.12%,_#78B8FF_118.29%)]  px-2.75 py-2 rounded-full ">
            Suggestion
          </span>

          <h3 className="mt-3 font-semibold ">
            Pick a plan
          </h3>

          <p className="text-sm  mt-1">
            Choose a subscription plan to continue using all features.
          </p>
        </div>

        <Link
          href={activeSiteId ? `/dashboard/${activeSiteId}/upgrade` : "/dashboard"}
          className="flex items-center font-medium gap-1.5 text-[#007AFF] text-[15px] mt-auto pt-6 cursor-pointer"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M16.6667 3.33333H3.33341C2.41425 3.33333 1.66675 4.08083 1.66675 5V15C1.66675 15.9192 2.41425 16.6667 3.33341 16.6667H16.6667C17.5859 16.6667 18.3334 15.9192 18.3334 15V5C18.3334 4.08083 17.5859 3.33333 16.6667 3.33333ZM3.33341 5H16.6667V6.66667H3.33341V5ZM3.33341 15V10H16.6676L16.6684 15H3.33341Z" fill="#007AFF"/>
<path d="M5.00008 11.6667H10.0001V13.3333H5.00008V11.6667Z" fill="#007AFF"/>
</svg>

          View Plans
        </Link>
      </div>

    </div>
  );
}