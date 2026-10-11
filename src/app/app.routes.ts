import { Routes } from '@angular/router';

export const routes: Routes = [
  // Thiệp mời: /?to=Anh+Nam (tiêu đề tab do trang tự đặt theo tên khách)
  { path: '', loadComponent: () => import('./pages/invite/invite').then((m) => m.Invite) },
  {
    path: 'tao-link',
    title: 'Tạo link thiệp mời · Bảo & Hương',
    loadComponent: () => import('./pages/generator/generator').then((m) => m.Generator),
  },
  { path: '**', redirectTo: '' },
];
