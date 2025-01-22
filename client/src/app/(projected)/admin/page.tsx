import React from 'react';
import { getSession } from '@/lib/session';

const AdminPage = async () => {

  const sesstion = await getSession()
  if(sesstion?.user.role !== 'admin'){
    return (
      <>
       <h1>your not an admin, please <a href="/signin">Login</a> as a admin account</h1>
      </>
    )
  }

  return (
    <div>AdminPage</div>
  );
};
export default AdminPage;
