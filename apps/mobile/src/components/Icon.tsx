import {
  AddCircleIcon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  Basketball01Icon,
  Calendar03Icon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  FilterIcon,
  FootballIcon,
  GoalIcon,
  Home01Icon,
  Infinity01Icon,
  Location01Icon,
  Logout01Icon,
  MapPinIcon,
  MinusSignIcon,
  PlusIcon,
  RefreshIcon,
  Search01Icon,
  StarIcon,
  Target01Icon,
  UserAdd01Icon,
  UserEdit01Icon,
  UserGroupIcon,
  UserIcon,
  VolleyballIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';

export const iconSet = {
  add: AddCircleIcon,
  arrow: ArrowRight01Icon,
  arrowDown: ArrowDown01Icon,
  arrowUp: ArrowUp01Icon,
  back: ArrowLeft01Icon,
  calendar: Calendar03Icon,
  basketball: Basketball01Icon,
  cancel: Cancel01Icon,
  check: CheckmarkCircle01Icon,
  clock: Clock01Icon,
  filter: FilterIcon,
  football: FootballIcon,
  handball: GoalIcon,
  home: Home01Icon,
  infinity: Infinity01Icon,
  location: MapPinIcon,
  logout: Logout01Icon,
  map: Location01Icon,
  minus: MinusSignIcon,
  plus: PlusIcon,
  refresh: RefreshIcon,
  search: Search01Icon,
  star: StarIcon,
  dodgeball: Target01Icon,
  volleyball: VolleyballIcon,
  userAdd: UserAdd01Icon,
  userEdit: UserEdit01Icon,
  group: UserGroupIcon,
  user: UserIcon,
} as const;

export type IconName = keyof typeof iconSet;
export function AppIcon({
  name,
  size = 20,
  color = '#202021',
  strokeWidth = 1.5,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  return <HugeiconsIcon icon={iconSet[name]} size={size} color={color} strokeWidth={strokeWidth} />;
}
