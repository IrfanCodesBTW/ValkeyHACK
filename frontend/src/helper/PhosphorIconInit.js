
import { useEffect } from "react";
export default function PhosphorIconInit() {

  useEffect(() => {
    if (process.env.NODE_ENV === "test") return undefined;
    var head = document.getElementsByTagName("head")[0];
    const links = [];

    for (const weight of ["regular", "thin", "light", "bold", "fill", "duotone"]) {
      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.type = "text/css";
      link.href =
        "https://unpkg.com/@phosphor-icons/web@2.1.1/src/" + weight + "/style.css";
      head.appendChild(link);
      links.push(link);
    }

    return () => links.forEach((link) => link.remove());
  }, [])

  return null
}
