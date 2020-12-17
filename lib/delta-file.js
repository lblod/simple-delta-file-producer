import { uuid, sparqlEscapeDateTime } from 'mu';
import { querySudo as query, updateSudo as update } from '@lblod/mu-auth-sudo';
import fs from 'fs-extra';
import moment from 'moment';
import { FILE_GRAPH, PUBLISHER_URI, RELATIVE_FILE_PATH, SHARE_FOLDER } from './config';

export default class DeltaFile {

  constructor(req) {
    this.delta = req.body;
  }

  get isEmpty() {
    return this.delta.length === 0;
  }

  /**
   * Write current state of the delta cache to a file
   *
   * @public
   */
  async writeToDisk() {
    try {
      const filename = `delta-${moment().toISOString()}.json`;
      const dir = `/${SHARE_FOLDER}/${RELATIVE_FILE_PATH}/${moment().format('YYYY-MM-DD')}`;
      const filepath = `${dir}/${filename}`;
      await fs.ensureDir(dir);
      await fs.writeJSON(filepath, this.delta);
      console.log(`Delta has been written to file.`);
      await this.writeFileToStore(filename, filepath);
      console.log('File is persisted in store and can be consumed now.');
    } catch (e) {
      console.log(e);
    }
  }

  /**
   * Get all delta files produced since a given timestamp
   *
   * @param since {string} ISO date time
   * @public
   */
  static async getDeltaFiles(since) {
    console.log(`Retrieving delta files since ${since}`);

    const result = await query(`
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX nfo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#>
    PREFIX nie: <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#>
    PREFIX dct: <http://purl.org/dc/terms/>

    SELECT ?uuid ?filename ?created WHERE {
      ?s a nfo:FileDataObject ;
          mu:uuid ?uuid ;
          nfo:fileName ?filename ;
          dct:publisher <${PUBLISHER_URI}> ;
          dct:created ?created .
      ?file nie:dataSource ?s .

      FILTER (?created > "${since}"^^xsd:dateTime)
    } ORDER BY ?created
  `);

    return result.results.bindings.map(b => {
      return {
        type: 'files',
        id: b['uuid'].value,
        attributes: {
          name: b['filename'].value,
          created: b['created'].value,
        },
      };
    });
  }

  /**
   * @private
   */
  async writeFileToStore(filename) {
    const virtualFileUuid = uuid();
    const virtualFileUri = `http://data.lblod.info/files/${virtualFileUuid}`;
    const nowLiteral = sparqlEscapeDateTime(moment());
    const physicalFileUuid = uuid();
    const physicalFileUri = `share://${RELATIVE_FILE_PATH}/${moment().format('YYYY-MM-DD')}/${filename}`;

    await update(`
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX nfo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#>
    PREFIX nie: <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#>
    PREFIX dbpedia: <http://dbpedia.org/resource/>
    PREFIX dct: <http://purl.org/dc/terms/>

    INSERT DATA {
      GRAPH <${FILE_GRAPH}> {
        <${virtualFileUri}> a nfo:FileDataObject ;
          mu:uuid "${virtualFileUuid}" ;
          nfo:fileName "${filename}" ;
          dct:format "application/json" ;
          dbpedia:fileExtension "json" ;
          dct:created ${nowLiteral} ;
          dct:modified ${nowLiteral} ;
          dct:publisher <${PUBLISHER_URI}> .
        <${physicalFileUri}> a nfo:FileDataObject ;
          mu:uuid "${physicalFileUuid}" ;
          nie:dataSource <${virtualFileUri}> ;
          nfo:fileName "${filename}" ;
          dct:format "application/json" ;
          dbpedia:fileExtension "json" ;
          dct:created ${nowLiteral} ;
          dct:modified ${nowLiteral} .
      }
    }
  `);
  }
}

