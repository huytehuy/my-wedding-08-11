import { Routes } from '@angular/router';

export const routes: Routes = [
  // Thiệp mời: /?to=Anh+Nam (tiêu đề tab do trang tự đặt theo tên khách)
  { path: '', loadComponent: () => import('./pages/invite/invite').then((m) => m.Invite) },
  {
    path: 'tao-link',
    title: 'Tạo link thiệp mời · Bảo & Hương',
    loadComponent: () => import('./pages/generator/generator').then((m) => m.Generator),
  },
  {
    // Xem link đã tạo và ai đã mở thiệp (log trên Firebase, đăng nhập bằng số điện thoại)
    path: 'xem-log',
    title: 'Ai đã xem thiệp · Bảo & Hương',
    loadComponent: () => import('./pages/logs/logs').then((m) => m.Logs),
  },
  { path: '**', redirectTo: '' },
];
