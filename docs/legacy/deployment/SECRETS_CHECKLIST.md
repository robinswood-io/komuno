# Checklist de Vérification des Secrets GitHub

## ✅ Vérification Rapide

Allez sur : **https://github.com/Aoleon/cjd80/settings/secrets/actions**

### Secrets à Vérifier

- [ ] **VPS_SSH_KEY** : Clé privée SSH complète (avec `-----BEGIN...` et `-----END...`)
- [ ] **VPS_HOST** : `141.94.31.162`
- [ ] **VPS_PORT** : `22`
- [ ] **VPS_USER** : `thibault` ⚠️ **CRITIQUE - Vérifiez que ce n'est pas vide !**

## 🔧 Correction de VPS_USER

Si `VPS_USER` est vide ou manquant :

1. Cliquez sur **VPS_USER** dans la liste
2. Si vide → Cliquez sur **Update secret**
3. Entrez exactement : `thibault` (sans guillemets, sans espaces)
4. Cliquez sur **Update secret**
5. Vérifiez que la date de mise à jour apparaît maintenant

## 🧪 Test

Après avoir corrigé les secrets :

1. Allez sur : https://github.com/Aoleon/cjd80/actions
2. Cliquez sur **Run workflow** → **Run workflow**
3. Vérifiez que l'étape "Precheck secrets" passe ✅

## 📝 Notes

- Les secrets sont sensibles, ne les partagez jamais
- Si vous modifiez un secret, le workflow en cours peut échouer (normal)
- Relancez le workflow après avoir corrigé les secrets

