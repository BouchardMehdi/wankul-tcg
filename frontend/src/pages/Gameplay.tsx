import "../styles.css";
import "../styles/Gameplay.css";

import AppNavbar from "../components/AppNavbar";

export default function Gameplay() {
  return (
    <>
      <AppNavbar currentPage="gameplay" />

      <main className="container gameplayPage">
        <section className="gameplayHero">
          <div className="gameplayHero__badge">Mode de jeu</div>
          <h1>Le gameplay arrive prochainement</h1>
          <p>
            La partie jeu de cartes est en préparation. Bientôt, tu pourras
            utiliser ta collection pour construire une vraie stratégie, jouer
            avec les raretés et donner une nouvelle valeur à tes cartes.
          </p>

          <div className="gameplayHero__panel">
            <span>En attendant</span>
            <strong>Continue d'ouvrir, collectionner et surveiller le market.</strong>
            <p>
              Les cartes que tu récupères maintenant serviront de base pour les
              prochaines fonctionnalités de gameplay.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
