"use client";

import { Switch } from "@/components/ui/switch";
import { useState } from "react";

const Page = () => {
  const user = [
    { name: "one", status: 1 },
    { name: "two", status: 0 },
  ];

  const [users, setUsers] = useState(user);

  const HandleStatusChange = (idx: number, checked: boolean) => {
    setUsers((prev) =>
      prev.map((u, i) => (i === idx ? { ...u, status: checked ? 1 : 0 } : u)),
    );
  };

  const handleSubmit = (status: number) => {
    console.log(status);
  };

  return (
    <div>
      {users.map((u, idx) => (
        <Switch
          key={idx}
          checked={u.status === 1}
          onCheckedChange={(checked) => HandleStatusChange(idx, checked)}
          //   onClick={handleSubmit}
        />
      ))}
    </div>
  );
};

export default Page;
