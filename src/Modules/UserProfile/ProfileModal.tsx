"use client";

import { Popover, PopoverContent } from "@/components/ui/popover";
import { useAuthSession } from "../Context/SessionProvider";
import ProfileAvatar from "@/utils/profile/ProfileAvatar";
import { PopoverTrigger } from "@radix-ui/react-popover";
import { Button } from "@/components/ui/button";
import { signOut } from "../../lib/auth-client";
import { useTransition } from "react";
import { Loader2Spinner } from "@/utils/Alerts/Loader2Spinner";
import { LogOutIcon } from "lucide-react";
import { useRouter } from "next/navigation";

function ProfileModal() {
  const { user } = useAuthSession();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleLogOut = async () => {
    startTransition(async () => {
      const { data } = await signOut();
      if (data?.success) {
        router.push("/sign-in");
      }
    });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="link"
          className="p-0 rounded-full focus:outline-none"
          aria-label="Open profile menu"
        >
          <ProfileAvatar name={user.name} url={user.image || ""} />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-60 p-4 rounded-lg shadow-md">
        <div className="flex flex-col gap-2">
          <Button
            className="flex items-center justify-start gap-2 w-full"
            disabled={isPending}
            onClick={handleLogOut}
            variant={"destructive"}
          >
            {isPending ? (
              <Loader2Spinner />
            ) : (
              <>
                <LogOutIcon className="h-4 w-4" /> Logout
              </>
            )}
          </Button>

          <Button
            className="w-full flex justify-start"
            variant={"outline"}
            onClick={() => router.push("/users/staff/profile")}
          >
            Profile
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default ProfileModal;
