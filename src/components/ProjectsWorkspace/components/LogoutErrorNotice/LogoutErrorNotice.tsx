export const LogoutErrorNotice = ({ message, onBackToLogin }: { message: string; onBackToLogin: () => void }) => (
  <div role="alert" className="mb-5 rounded-md border border-[#ffcecb] bg-[#ffebe9] p-4 text-sm text-[#cf222e] [overflow-wrap:anywhere]">
    <p>{message}</p>
    <button type="button" onClick={onBackToLogin} className="mt-3 min-h-11 rounded-md border border-[#d0d7de] bg-white px-3 py-2 font-semibold text-[#24292f]">
      Retour à la connexion
    </button>
  </div>
);
