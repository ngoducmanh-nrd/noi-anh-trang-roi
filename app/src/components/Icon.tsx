import { useAnimateIconContext } from '@animate-ui/react/icons';
import { animatedIcons, lucideIcons } from './animate-ui/registry';

type IconProps={name:string;size?:number;className?:string};

/** Decorative icon; the containing button/link provides the accessible label. */
export function Icon({name,size=20,className=''}:IconProps){
  const {controls}=useAnimateIconContext();
  const lucide=(lucideIcons as Record<string,(typeof lucideIcons)[keyof typeof lucideIcons]|undefined>)[name];
  const Component=lucide||animatedIcons[name as keyof typeof animatedIcons]||animatedIcons.sparkles;
  // Buttons/nav links own the trigger. Standalone icons respond to direct interaction.
  const triggers=controls?{}:{animateOnHover:true,animateOnTap:true,completeOnStop:true};
  return <Component {...triggers} size={size} className={`icon ${className}`} aria-hidden="true" focusable="false" data-icon={name} data-icon-library={lucide?'animate-ui-lucide':'animate-ui-hugeicons'}/>;
}
