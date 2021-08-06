import { singleton } from 'tsyringe';
import { Configuration } from '../../common/config/Configuration';
import { IFigureMap } from '../../mapping/json';
import { HabboAssetSWF } from '../../swf/HabboAssetSWF';
import File from '../../utils/File';
import { FileUtilities } from '../../utils/FileUtilities';
import { Logger } from '../../utils/Logger';
import { FigureMapConverter } from '../figuremap/FigureMapConverter';

@singleton()
export class FigureDownloader
{
    public static FIGURE_TYPES: Map<string, string> = new Map();

    constructor(
        private readonly _figureMapConverter: FigureMapConverter,
        private readonly _configuration: Configuration,
        private readonly _logger: Logger)
    {}

    public async download(directory: File, callback: (habboAssetSwf: HabboAssetSWF, className: string) => Promise<void>): Promise<void>
    {
        await this._figureMapConverter.convertAsync();

        const figureMap = await this.parseFigureMap();
        const classNames: string[] = [];

        if(figureMap.libraries !== undefined)
        {
            for(const library of figureMap.libraries)
            {
                const className = library.id.split('*')[0];

                const existingFile = new File(directory.path + '/' + className + '.nitro');

                if(existingFile.exists()) continue;

                if(className === 'hh_human_fx' || className === 'hh_pets') continue;

                if(classNames.indexOf(className) >= 0) continue;

                classNames.push(className);

                try
                {
                    FigureDownloader.FIGURE_TYPES.set(className, library.parts[0].type);

                    await this.extractFigure(className, callback);
                }

                catch (error)
                {
                    console.log();
                    console.error(`Error parsing ${ className }: ` + error.message);

                    this._logger.logError(`Error parsing ${ className }: ` + error.message);
                }
            }
        }
    }

    public async parseFigureMap(): Promise<IFigureMap>
    {
        const url = this._configuration.getValue('figuremap.load.url');

        if(!url || !url.length) return null;

        const logDownloads = this._configuration.getBoolean('misc.log_download_urls');

        if(logDownloads) console.log(`<Downloader> Downloading figure data from ${url}`);

        const content = await FileUtilities.readFileAsString(url);

        if(!content || !content.length) return null;

        return (JSON.parse(content) as IFigureMap);
    }

    public async extractFigure(className: string, callback: (habboAssetSwf: HabboAssetSWF, className: string) => Promise<void>): Promise<void>
    {
        let url = this._configuration.getValue('dynamic.download.figure.url');

        if(!url || !url.length) return;

        url = url.replace('%className%', className);

        const logDownloads = this._configuration.getBoolean('misc.log_download_urls');

        if(logDownloads) console.log(`<Downloader> Downloading figure from ${url}`);

        const buffer = await FileUtilities.readFileAsBuffer(url);

        if(!buffer) return;

        const newHabboAssetSWF = new HabboAssetSWF(buffer);

        await newHabboAssetSWF.setupAsync();

        await callback(newHabboAssetSWF, className);
    }
}
