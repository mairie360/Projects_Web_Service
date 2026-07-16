'use client';

import { UserProfilePage } from '@mairie360/lib-components';
import { useRouter } from 'next/navigation';

import { appSidebarItems, currentUser, getNavigationHref } from '../../lib/appShell';

export default function ProfilePage() {
  const router = useRouter();

  const handlePageChange = (page: string) => {
    const href = getNavigationHref(page);

    if (href) router.push(href);
  };

  return (
    <UserProfilePage
      user={currentUser}
      isAdmin
      activeItem="profile"
      headerProps={{
        profileHref: '/profile',
        onPageChange: handlePageChange,
      }}
      sidebarProps={{
        items: appSidebarItems,
        brandLabel: 'Mairie360',
        brandInitial: 'M',
      }}
      footerProps={{
        productName: 'Mairie360',
        year: 2026,
        version: '2.1.0',
        className: 'shrink-0',
      }}
      profileProps={{
        editable: true,
        subtitle: 'Informations du compte connecté',
      }}
    />
  );
}
