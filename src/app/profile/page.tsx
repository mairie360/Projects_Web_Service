'use client';

import { UserProfilePage } from '@mairie360/lib-components';
import { useRouter } from 'next/navigation';

import { appSidebarItems, currentUser, getNavigationHref } from '../../lib/appShell';
import { logoutAndReload, useAuthSession } from '../../lib/auth-session';

export default function ProfilePage() {
  const router = useRouter();
  const session = useAuthSession(currentUser);

  const handlePageChange = (page: string) => {
    const href = getNavigationHref(page);

    if (!href) return;

    if (href.startsWith('/')) {
      router.push(href);
      return;
    }

    window.location.assign(href);
  };

  return (
    <UserProfilePage
      user={session.user}
      isAdmin={session.isAdmin}
      activeItem="profile"
      headerProps={{
        profileHref: '/profile',
        onPageChange: handlePageChange,
        onLogout: () => void logoutAndReload(),
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
        editable: false,
        // loading: session.loading,
        // error: session.error,
        subtitle: 'Informations réelles du compte connecté',
      }}
    />
  );
}
