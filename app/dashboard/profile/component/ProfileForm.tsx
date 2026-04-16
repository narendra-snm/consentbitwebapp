type Props = {
  name?: string;
  email?: string;
};

export default function ProfileDisplay({ name, email }: Props) {
  const displayName = String(name || "").trim() || "—";
  const displayEmail = String(email || "").trim() || "—";

  return (
    <div className="flex gap-[227px] pl-5 bg-white w-full justify-between max-w-[1193px]">
      
      {/* Left Info */}
      <div className="flex flex-col gap-6 w-[376px] text-left">
        
        {/* Name */}
        <div>
          <p className=" text-[#4B5563] mb-2">Name</p>
          <div className="min-h-[48px] flex items-center px-3 border border-[#E5E5E5] rounded-md  text-[#111827] bg-white">
            {displayName}
          </div>
        </div>

        {/* Email */}
        <div>
          <p className="text-[#4B5563] mb-2">Email</p>
          <div className="min-h-[48px] flex items-center px-3 border border-[#E5E5E5] rounded-md  text-[#111827] bg-white">
            {displayEmail}
          </div>
        </div>

      </div>

      {/* Right Preview Card */}
      {/* Right Preview Card */}
<div className="flex-1 max-w-[554px] bg-[#FBFBFB] border border-[#EBEBEB] rounded-lg px-6.5 py-6.75 flex flex-col  text-left">
  
  {/* Avatar */}
  <img
    src="/images/profile.svg" // put this image in your public folder
    alt="Profile"
    className="w-14 h-14 rounded-full object-cover mb-3.75"
  />

  {/* Name */}
  <p className="">
    {displayName}
  </p>

  {/* Email */}
  <p className=" mt-3">
    {displayEmail}
  </p>

</div>

    </div>
  );
}