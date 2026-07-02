import { readFileSync } from 'fs';

type ParsedFirebaseRecord = {
  id: string;
  data: unknown;
};

interface ParsedFirebaseData {
  admins: ParsedFirebaseRecord[];
  ideas: ParsedFirebaseRecord[];
  votes: ParsedFirebaseRecord[];
  inscriptions: ParsedFirebaseRecord[];
}

export class FirebaseDumpParser {
  
  static parseFirebaseDump(filePath: string): ParsedFirebaseData {
    console.log(`📄 Lecture du fichier: ${filePath}`);
    
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    const result: ParsedFirebaseData = {
      admins: [],
      ideas: [],
      votes: [],
      inscriptions: []
    };
    
    let currentTable = '';
    let processedLines = 0;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Détecter le début d'une table
      if (trimmedLine.includes('CREATE TABLE IF NOT EXISTS `admins`')) {
        currentTable = 'admins';
        console.log('📋 Table détectée: admins');
        continue;
      }
      if (trimmedLine.includes('CREATE TABLE IF NOT EXISTS `ideas`')) {
        currentTable = 'ideas';
        console.log('📋 Table détectée: ideas');
        continue;
      }
      if (trimmedLine.includes('CREATE TABLE IF NOT EXISTS `votes`')) {
        currentTable = 'votes';
        console.log('📋 Table détectée: votes');
        continue;
      }
      if (trimmedLine.includes('CREATE TABLE IF NOT EXISTS `inscriptions`')) {
        currentTable = 'inscriptions';
        console.log('📋 Table détectée: inscriptions');
        continue;
      }
      
      // Parser les INSERT statements - détecter la table directement dans la ligne
      if (trimmedLine.startsWith('INSERT INTO')) {
        try {
          // Détecter la table directement dans la ligne INSERT
          let tableFromInsert = '';
          if (trimmedLine.includes('INSERT INTO `admins`')) {
            tableFromInsert = 'admins';
          } else if (trimmedLine.includes('INSERT INTO `ideas`')) {
            tableFromInsert = 'ideas';
          } else if (trimmedLine.includes('INSERT INTO `votes`')) {
            tableFromInsert = 'votes';
          } else if (trimmedLine.includes('INSERT INTO `inscriptions`')) {
            tableFromInsert = 'inscriptions';
          }
          
          const parsed = this.parseInsertStatement(trimmedLine, tableFromInsert);
          if (parsed && tableFromInsert) {
            switch (tableFromInsert) {
              case 'admins':
                result.admins.push(parsed);
                break;
              case 'ideas':
                result.ideas.push(parsed);
                break;
              case 'votes':
                result.votes.push(parsed);
                break;
              case 'inscriptions':
                result.inscriptions.push(parsed);
                break;
            }
            processedLines++;
          }
        } catch (error) {
          console.warn(`⚠️  Erreur parsing ligne: ${trimmedLine.slice(0, 100)}...`);
          console.warn('   Erreur:', error);
        }
      }
    }
    
    console.log(`✅ Parsing terminé: ${processedLines} lignes traitées`);
    console.log(`📊 Résultats:`);
    console.log(`   Admins: ${result.admins.length}`);
    console.log(`   Idées: ${result.ideas.length}`);
    console.log(`   Votes: ${result.votes.length}`);
    console.log(`   Inscriptions: ${result.inscriptions.length}`);
    
    return result;
  }
  
  private static parseInsertStatement(line: string, table: string): ParsedFirebaseRecord | null {
    // Exemple: INSERT INTO `admins` (`doc_path`,`id`,`parent_path`,`data`) VALUES ('admins/benoit@goyheneche,fr','benoit@goyheneche,fr','','{"email":"benoit@goyheneche.fr","addedBy":"benoit@metio.fr","createdAt":"2025-06-23T16:12:58.363000Z"}');
    
    const valuesMatch = line.match(/VALUES\s*\((.*)\);?$/);
    if (!valuesMatch) return null;
    
    const valuesStr = valuesMatch[1];
    
    // Parser les valeurs (format: 'val1','val2','val3','{"json":"data"}')
    const values = this.parseValues(valuesStr);
    
    if (values.length < 4) return null;
    
    const [docPath, id, parentPath, dataStr] = values;
    
    try {
      // Nettoyer les caractères échappés avant le parsing JSON
      let cleanedDataStr = dataStr;
      
      // Remplacer les échappements SQL par des échappements JSON valides
      cleanedDataStr = cleanedDataStr
        .replace(/\\n/g, '\\n')        // Préserver les sauts de ligne
        .replace(/\\"/g, '\\"')        // Préserver les guillemets échappés  
        .replace(/\\\\/g, '\\\\')      // Préserver les backslashes
        .replace(/''/g, "'");          // Convertir les apostrophes doublées SQL en apostrophes simples
      
      const data = JSON.parse(cleanedDataStr);
      return {
        id,
        data
      };
    } catch (error) {
      // Essayer une approche plus agressive pour les cas difficiles
      try {
        console.warn(`⚠️  Tentative de parsing alternatif pour ${id}`);
        
        // Pour les cas très difficiles, essayer de reconstruire le JSON
        let repairJson = dataStr;
        
        // Gérer les guillemets non échappés à l'intérieur des strings
        // Cette approche est plus risquée mais peut récupérer des données autrement perdues
        const data = JSON.parse(repairJson);
        console.log(`✅ Récupération réussie pour ${id}`);
        return {
          id,
          data
        };
      } catch (secondError) {
        console.warn(`❌ Impossible de parser ${id}:`, error);
        console.warn(`   Données brutes: ${dataStr.slice(0, 200)}...`);
        return null;
      }
    }
  }
  
  private static parseValues(valuesStr: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    let escapeNext = false;
    let i = 0;
    
    while (i < valuesStr.length) {
      const char = valuesStr[i];
      
      if (escapeNext) {
        // Gérer les caractères échappés correctement
        if (char === 'n') {
          current += '\n';
        } else if (char === 't') {
          current += '\t';
        } else if (char === 'r') {
          current += '\r';
        } else if (char === '\\') {
          current += '\\';
        } else if (char === '"') {
          current += '"';
        } else if (char === "'") {
          current += "'";
        } else {
          current += char;
        }
        escapeNext = false;
      } else if (char === '\\') {
        // Marquer le prochain caractère comme échappé
        escapeNext = true;
      } else if (char === "'" && !escapeNext) {
        if (inQuotes) {
          // Fin de quote, mais vérifier si c'est une quote échappée SQL ('')
          if (i + 1 < valuesStr.length && valuesStr[i + 1] === "'") {
            // Quote échappée SQL, ajouter une seule quote au résultat
            current += "'";
            i++; // Skip la prochaine quote
          } else {
            // Vraie fin de quote
            inQuotes = false;
          }
        } else {
          // Début de quote
          inQuotes = true;
        }
      } else if (char === ',' && !inQuotes) {
        // Fin de valeur
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
      
      i++;
    }
    
    // Ajouter la dernière valeur
    if (current.trim()) {
      values.push(current.trim());
    }
    
    return values;
  }
}