import Swal, { SweetAlertIcon } from "sweetalert2";

interface props {
  title:
    | "Success!"
    | "An error has occurred"
    | "Warning"
    | "Information"
    | "Are you sure?"
    | (string & {});
  text: string;
  icon: SweetAlertIcon;
  showCloseButton?: boolean;
}

export const Sweetalert = ({
  title,
  text,
  icon,
  showCloseButton = true,
}: props) => {
  return Swal.fire({
    title,
    text,
    icon,
    showCloseButton,
  });
};
