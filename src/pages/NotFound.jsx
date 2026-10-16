import { Link } from "react-router-dom";
export default function NotFound() {
  return (<><h1>404</h1><p className="mut">الصفحة غير موجودة.</p><Link className="lnk" to="/">العودة للرئيسية</Link></>);
}
