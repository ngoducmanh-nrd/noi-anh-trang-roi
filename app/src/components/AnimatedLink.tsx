import { AnimateIcon } from '@animate-ui/react/icons';
import { Link,NavLink,type LinkProps,type NavLinkProps } from 'react-router-dom';

export function AnimatedLink(props:LinkProps){
  return <AnimateIcon asChild animateOnHover animateOnTap completeOnStop><Link {...props}/></AnimateIcon>;
}
// Slot merges className as text; keep React Router's callback outside that merge.
function NavTarget({navClassName,className,...props}:Omit<NavLinkProps,'className'>&{navClassName:NavLinkProps['className'];className?:string}){
  return <NavLink {...props} className={state=>[typeof navClassName==='function'?navClassName(state):navClassName,className].filter(Boolean).join(' ')}/>;
}
export function AnimatedNavLink({className,...props}:NavLinkProps){
  return <AnimateIcon asChild animateOnHover animateOnTap completeOnStop><NavTarget {...props} navClassName={className}/></AnimateIcon>;
}
